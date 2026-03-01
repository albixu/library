#!/usr/bin/env bash
# ============================================================
# setup-ollama-models.sh
# ============================================================
# Script to download, verify, and warm-up required AI models in Ollama.
#
# Models:
#   - nomic-embed-text: For generating embeddings (semantic search) [ollama-embeddings]
#   - llama3.2:3b: For translating descriptions to Spanish [ollama-translations]
#
# Features:
#   - Downloads models if not present
#   - Verifies models work correctly
#   - Warms up models (pre-loads into memory) for faster first requests
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

OLLAMA_EMBEDDING_HOST="${OLLAMA_EMBEDDING_HOST:-http://localhost:11434}"
OLLAMA_EMBEDDING_CONTAINER="${OLLAMA_EMBEDDING_CONTAINER:-library-ollama-embeddings}"

OLLAMA_TRANSLATION_HOST="${OLLAMA_TRANSLATION_HOST:-http://localhost:11435}"
OLLAMA_TRANSLATION_CONTAINER="${OLLAMA_TRANSLATION_CONTAINER:-library-ollama-translations}"

# Models to download
MODELS=(
    "nomic-embed-text|${OLLAMA_EMBEDDING_HOST}|${OLLAMA_EMBEDDING_CONTAINER}"
    "llama3.2:3b|${OLLAMA_TRANSLATION_HOST}|${OLLAMA_TRANSLATION_CONTAINER}"
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
    local host="$1"
    local container="$2"
    log_info "Checking if Ollama ${container} is running at ${host}..."
    
    local max_retries=30
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s "${host}/api/tags" > /dev/null 2>&1; then
            log_success "Ollama ${container} is running!"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        log_warn "Ollama ${container} not ready yet. Retrying in 2 seconds... ($retry_count/$max_retries)"
        sleep 2
    done
    
    log_error "Ollama ${container} is not responding at ${host}"
    log_error "Make sure the Ollama container is running:"
    log_error "  docker-compose -f docker-compose.prod.yml up -d ${container}"
    return 1
}

check_model_exists() {
    local model_name="$1"
    local host="$2"
    local response
    
    response=$(curl -s "${host}/api/tags")
    
    if echo "$response" | grep -q "\"name\":\"${model_name}\""; then
        return 0
    else
        return 1
    fi
}

download_model() {
    local model_name="$1"
    local host="$2"
    
    log_info "Downloading model: ${model_name} from ${host}..."
    log_info "This may take several minutes depending on your connection speed."
    
    # Use curl to pull the model (streaming response)
    local response
    response=$(curl -s -X POST "${host}/api/pull" \
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
            if check_model_exists "$model_name" "$host"; then
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
    local host="$2"
    
    log_info "Verifying model: ${model_name} from ${host}..."
    
    # For embedding model, test with a simple embedding request
    if [[ "$model_name" == *"embed"* ]]; then
        local response
        response=$(curl -s -X POST "${host}/api/embeddings" \
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
        response=$(curl -s -X POST "${host}/api/generate" \
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

warmup_model() {
    local model_name="$1"
    local host="$2"
    
    log_info "Warming up model: ${model_name} (pre-loading into memory)..."
    
    # For embedding model, run a simple embedding to load into memory
    if [[ "$model_name" == *"embed"* ]]; then
        curl -s -X POST "${host}/api/embeddings" \
            -H "Content-Type: application/json" \
            -d "{\"model\": \"${model_name}\", \"prompt\": \"Warmup embedding request to pre-load model into memory for faster subsequent requests.\"}" \
            --max-time 120 > /dev/null 2>&1
    else
        # For LLM models, run a simple generation to load into memory
        curl -s -X POST "${host}/api/generate" \
            -H "Content-Type: application/json" \
            -d "{\"model\": \"${model_name}\", \"prompt\": \"Respond with OK\", \"stream\": false}" \
            --max-time 180 > /dev/null 2>&1
    fi
    
    log_success "Model ${model_name} warmed up and ready!"
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
    log_info "Verifying hosts and containers..."
    
    # Precheck hosts
    for model_info in "${MODELS[@]}"; do
        IFS='|' read -r model host container <<< "$model_info"
        if ! check_ollama_running "$host" "$container"; then
             exit 1
        fi
    done
    
    echo ""
    log_info "Models to install..."
    echo ""
    
    local failed_models=()
    local failed_containers=()
    
    for model_info in "${MODELS[@]}"; do
        IFS='|' read -r model host container <<< "$model_info"
        echo "------------------------------------------------------------"
        
        if check_model_exists "$model" "$host"; then
            log_success "Model ${model} is already installed!"
            verify_model "$model" "$host"
        else
            if download_model "$model" "$host"; then
                verify_model "$model" "$host"
            else
                failed_models+=("$model")
                failed_containers+=("$container")
            fi
        fi
        
        echo ""
    done
    
    # Warm up all models (pre-load into memory for faster first requests)
    echo "------------------------------------------------------------"
    log_info "Warming up models (pre-loading into memory)..."
    echo ""
    
    for model_info in "${MODELS[@]}"; do
        IFS='|' read -r model host container <<< "$model_info"
        if check_model_exists "$model" "$host"; then
            warmup_model "$model" "$host"
        fi
    done
    
    echo ""
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
        for i in "${!failed_models[@]}"; do
            log_error "  docker exec ${failed_containers[$i]} ollama pull ${failed_models[$i]}"
        done
        exit 1
    fi
}

# Run main function
main "$@"
