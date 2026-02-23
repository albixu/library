#!/usr/bin/env bash
# ============================================================
# setup-ollama-models.sh
# ============================================================
# Script to download and initialize required AI models in Ollama.
#
# Models:
#   - nomic-embed-text: For generating embeddings (semantic search)
#   - qwen2.5:3b: For translating descriptions to Spanish
#
# Usage:
#   ./scripts/setup-ollama-models.sh
#
# Prerequisites:
#   - Ollama container must be running
#   - curl must be available
# ============================================================

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
OLLAMA_CONTAINER="${OLLAMA_CONTAINER:-library-ollama}"

# Models to download
MODELS=(
    "nomic-embed-text"
    "qwen2.5:3b"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# Functions
# ============================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_ollama_running() {
    log_info "Checking if Ollama is running at ${OLLAMA_HOST}..."
    
    local max_retries=30
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1; then
            log_success "Ollama is running!"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log_warn "Ollama not ready yet. Retrying in 2 seconds... ($retry_count/$max_retries)"
        sleep 2
    done
    
    log_error "Ollama is not responding at ${OLLAMA_HOST}"
    log_error "Make sure the Ollama container is running:"
    log_error "  docker-compose -f docker-compose.prod.yml up -d ollama"
    exit 1
}

check_model_exists() {
    local model_name="$1"
    local response
    
    response=$(curl -s "${OLLAMA_HOST}/api/tags")
    
    if echo "$response" | grep -q "\"name\":\"${model_name}\""; then
        return 0
    else
        return 1
    fi
}

download_model() {
    local model_name="$1"
    
    log_info "Downloading model: ${model_name}..."
    log_info "This may take several minutes depending on your connection speed."
    
    # Use curl to pull the model (streaming response)
    local response
    response=$(curl -s -X POST "${OLLAMA_HOST}/api/pull" \
        -H "Content-Type: application/json" \
        -d "{\"name\": \"${model_name}\", \"stream\": false}" \
        --max-time 3600) # 1 hour timeout for large models
    
    if echo "$response" | grep -q '"status":"success"'; then
        log_success "Model ${model_name} downloaded successfully!"
        return 0
    elif echo "$response" | grep -q 'pulling'; then
        # Model is being pulled, wait for completion
        log_info "Model ${model_name} is being downloaded..."
        
        # Poll until model is available
        local poll_count=0
        local max_polls=360 # 30 minutes max
        
        while [ $poll_count -lt $max_polls ]; do
            sleep 5
            if check_model_exists "$model_name"; then
                log_success "Model ${model_name} downloaded successfully!"
                return 0
            fi
            poll_count=$((poll_count + 1))
            log_info "Still downloading ${model_name}... ($poll_count)"
        done
        
        log_error "Timeout waiting for model ${model_name}"
        return 1
    else
        log_error "Failed to download model ${model_name}"
        log_error "Response: ${response}"
        return 1
    fi
}

verify_model() {
    local model_name="$1"
    
    log_info "Verifying model: ${model_name}..."
    
    # For embedding model, test with a simple embedding request
    if [[ "$model_name" == *"embed"* ]]; then
        local response
        response=$(curl -s -X POST "${OLLAMA_HOST}/api/embeddings" \
            -H "Content-Type: application/json" \
            -d "{\"model\": \"${model_name}\", \"prompt\": \"test\"}" \
            --max-time 60)
        
        if echo "$response" | grep -q '"embedding"'; then
            log_success "Embedding model ${model_name} verified!"
            return 0
        fi
    else
        # For LLM models, test with a simple generate request
        local response
        response=$(curl -s -X POST "${OLLAMA_HOST}/api/generate" \
            -H "Content-Type: application/json" \
            -d "{\"model\": \"${model_name}\", \"prompt\": \"Say hello\", \"stream\": false}" \
            --max-time 120)
        
        if echo "$response" | grep -q '"response"'; then
            log_success "LLM model ${model_name} verified!"
            return 0
        fi
    fi
    
    log_warn "Model ${model_name} verification may have failed, but it might still work."
    return 0
}

# ============================================================
# Main
# ============================================================

main() {
    echo ""
    echo "============================================================"
    echo "  Library - Ollama Models Setup"
    echo "============================================================"
    echo ""
    
    # Check if Ollama is running
    check_ollama_running
    
    echo ""
    log_info "Models to install: ${MODELS[*]}"
    echo ""
    
    local failed_models=()
    
    for model in "${MODELS[@]}"; do
        echo "------------------------------------------------------------"
        
        if check_model_exists "$model"; then
            log_success "Model ${model} is already installed!"
            verify_model "$model"
        else
            if download_model "$model"; then
                verify_model "$model"
            else
                failed_models+=("$model")
            fi
        fi
        
        echo ""
    done
    
    echo "============================================================"
    
    if [ ${#failed_models[@]} -eq 0 ]; then
        log_success "All models installed successfully!"
        echo ""
        log_info "You can now start the API service:"
        log_info "  docker-compose -f docker-compose.prod.yml up -d api"
        echo ""
    else
        log_error "Some models failed to install: ${failed_models[*]}"
        log_error "Please try running this script again or download manually:"
        for model in "${failed_models[@]}"; do
            log_error "  docker exec ${OLLAMA_CONTAINER} ollama pull ${model}"
        done
        exit 1
    fi
}

# Run main function
main "$@"
