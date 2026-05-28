#!/usr/bin/env bash
# shellcheck disable=SC2155
#
# K6 Load Test Runner
#
# A unified script for running k6 load tests locally and in CI/CD.
# This script provides a consistent interface regardless of environment.
#
# Usage:
#   ./scripts/k6-run.sh [OPTIONS]
#
# Options:
#   -s, --scenario SCENARIO   Test scenario: smoke, load, stress, spike, soak (default: smoke)
#   -u, --url URL             Base URL to test (default: http://localhost:3000)
#   -d, --duration DURATION   Override test duration (e.g., 5m, 1h)
#   -v, --vus VUS             Override number of virtual users
#   -t, --script SCRIPT       Custom test script path
#   -o, --output DIR          Output directory for results (default: k6-results)
#   --docker                  Run k6 in Docker container (no local install required)
#   --cloud                   Run tests on k6 Cloud (requires K6_CLOUD_TOKEN)
#   --no-thresholds           Don't fail on threshold violations
#   --json                    Output results in JSON format
#   --csv                     Output results in CSV format
#   --html                    Generate HTML report
#   -h, --help                Show this help message
#
# Environment Variables:
#   K6_BASE_URL         Base URL (can be overridden by --url)
#   K6_CUSTOM_HEADERS   JSON string of custom headers
#   K6_CLOUD_TOKEN      k6 Cloud API token (for --cloud option)
#   K6_DOCKER_IMAGE     Custom k6 Docker image (default: grafana/k6:latest)
#
# Examples:
#   # Run smoke test against local server
#   ./scripts/k6-run.sh --scenario smoke
#
#   # Run load test against staging
#   ./scripts/k6-run.sh --scenario load --url https://staging.example.com
#
#   # Run with Docker (no k6 installation required)
#   ./scripts/k6-run.sh --scenario smoke --docker
#
#   # Run custom script with HTML report
#   ./scripts/k6-run.sh --script .github/k6/scripts/api-test.js --html

set -euo pipefail

# Script directory resolution
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly K6_DIR="${PROJECT_ROOT}/.github/k6"
readonly DEFAULT_OUTPUT_DIR="${PROJECT_ROOT}/k6-results"

# Default values
SCENARIO="smoke"
BASE_URL="${K6_BASE_URL:-http://localhost:3000}"
DURATION=""
VUS=""
CUSTOM_SCRIPT=""
OUTPUT_DIR="${DEFAULT_OUTPUT_DIR}"
USE_DOCKER=false
USE_CLOUD=false
FAIL_ON_THRESHOLD=true
OUTPUT_JSON=false
OUTPUT_CSV=false
OUTPUT_HTML=false
K6_DOCKER_IMAGE="${K6_DOCKER_IMAGE:-grafana/k6:latest}"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

show_help() {
    head -50 "${BASH_SOURCE[0]}" | grep "^#" | sed 's/^#//' | sed 's/^ //'
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--scenario)
                SCENARIO="$2"
                shift 2
                ;;
            -u|--url)
                BASE_URL="$2"
                shift 2
                ;;
            -d|--duration)
                DURATION="$2"
                shift 2
                ;;
            -v|--vus)
                VUS="$2"
                shift 2
                ;;
            -t|--script)
                CUSTOM_SCRIPT="$2"
                shift 2
                ;;
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            --docker)
                USE_DOCKER=true
                shift
                ;;
            --cloud)
                USE_CLOUD=true
                shift
                ;;
            --no-thresholds)
                FAIL_ON_THRESHOLD=false
                shift
                ;;
            --json)
                OUTPUT_JSON=true
                shift
                ;;
            --csv)
                OUTPUT_CSV=true
                shift
                ;;
            --html)
                OUTPUT_HTML=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Validate scenario
validate_scenario() {
    local valid_scenarios=("smoke" "load" "stress" "spike" "soak")
    local is_valid=false

    for valid in "${valid_scenarios[@]}"; do
        if [[ "${SCENARIO}" == "${valid}" ]]; then
            is_valid=true
            break
        fi
    done

    if [[ "${is_valid}" == false ]]; then
        log_error "Invalid scenario: ${SCENARIO}"
        log_info "Valid scenarios: ${valid_scenarios[*]}"
        exit 1
    fi
}

# Get test script path
get_test_script() {
    if [[ -n "${CUSTOM_SCRIPT}" ]]; then
        if [[ -f "${CUSTOM_SCRIPT}" ]]; then
            echo "${CUSTOM_SCRIPT}"
        elif [[ -f "${PROJECT_ROOT}/${CUSTOM_SCRIPT}" ]]; then
            echo "${PROJECT_ROOT}/${CUSTOM_SCRIPT}"
        else
            log_error "Custom script not found: ${CUSTOM_SCRIPT}"
            exit 1
        fi
    else
        local scenario_script="${K6_DIR}/scenarios/${SCENARIO}.js"
        if [[ -f "${scenario_script}" ]]; then
            echo "${scenario_script}"
        else
            log_error "Scenario script not found: ${scenario_script}"
            exit 1
        fi
    fi
}

# Check if k6 is installed
check_k6_installed() {
    if command -v k6 &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if Docker is available
check_docker_available() {
    if command -v docker &> /dev/null && docker info &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Build k6 command arguments
build_k6_args() {
    local test_script="$1"
    local args=()

    # Add output formats
    if [[ "${OUTPUT_JSON}" == true ]]; then
        args+=("--out" "json=${OUTPUT_DIR}/results.json")
    fi

    if [[ "${OUTPUT_CSV}" == true ]]; then
        args+=("--out" "csv=${OUTPUT_DIR}/results.csv")
    fi

    # Note: HTML output requires k6-reporter extension, using handleSummary instead

    # Add cloud option
    if [[ "${USE_CLOUD}" == true ]]; then
        args+=("--out" "cloud")
    fi

    # Add script path
    args+=("${test_script}")

    echo "${args[@]}"
}

# Build environment variables for k6
build_k6_env() {
    local env_vars=()

    env_vars+=("K6_BASE_URL=${BASE_URL}")
    env_vars+=("K6_SCENARIO=${SCENARIO}")

    if [[ -n "${DURATION}" ]]; then
        env_vars+=("K6_DURATION=${DURATION}")
    fi

    if [[ -n "${VUS}" ]]; then
        env_vars+=("K6_VUS=${VUS}")
    fi

    if [[ -n "${K6_CUSTOM_HEADERS:-}" ]]; then
        env_vars+=("K6_CUSTOM_HEADERS=${K6_CUSTOM_HEADERS}")
    fi

    if [[ -n "${K6_CLOUD_TOKEN:-}" ]]; then
        env_vars+=("K6_CLOUD_TOKEN=${K6_CLOUD_TOKEN}")
    fi

    echo "${env_vars[@]}"
}

# Run k6 locally
run_k6_local() {
    local test_script="$1"
    local k6_args
    k6_args=$(build_k6_args "${test_script}")

    log_info "Running k6 locally..."
    log_info "Script: ${test_script}"
    log_info "Base URL: ${BASE_URL}"
    log_info "Scenario: ${SCENARIO}"

    # Set environment variables
    export K6_BASE_URL="${BASE_URL}"
    export K6_SCENARIO="${SCENARIO}"

    if [[ -n "${DURATION}" ]]; then
        export K6_DURATION="${DURATION}"
    fi

    if [[ -n "${VUS}" ]]; then
        export K6_VUS="${VUS}"
    fi

    # Run k6
    # shellcheck disable=SC2086
    if k6 run ${k6_args}; then
        return 0
    else
        return 1
    fi
}

# Run k6 in Docker
run_k6_docker() {
    local test_script="$1"
    local k6_args
    k6_args=$(build_k6_args "/scripts/$(basename "${test_script}")")

    log_info "Running k6 in Docker..."
    log_info "Image: ${K6_DOCKER_IMAGE}"
    log_info "Script: ${test_script}"
    log_info "Base URL: ${BASE_URL}"
    log_info "Scenario: ${SCENARIO}"

    # Prepare Docker volume mounts
    local script_dir
    script_dir=$(dirname "${test_script}")

    # Build docker run command
    local docker_cmd=(
        "docker" "run" "--rm"
        "-v" "${script_dir}:/scripts:ro"
        "-v" "${OUTPUT_DIR}:/output"
        "-e" "K6_BASE_URL=${BASE_URL}"
        "-e" "K6_SCENARIO=${SCENARIO}"
    )

    # Add network mode for localhost access
    if [[ "${BASE_URL}" == *"localhost"* ]] || [[ "${BASE_URL}" == *"127.0.0.1"* ]]; then
        docker_cmd+=("--network" "host")
    fi

    # Add optional environment variables
    if [[ -n "${DURATION}" ]]; then
        docker_cmd+=("-e" "K6_DURATION=${DURATION}")
    fi

    if [[ -n "${VUS}" ]]; then
        docker_cmd+=("-e" "K6_VUS=${VUS}")
    fi

    if [[ -n "${K6_CUSTOM_HEADERS:-}" ]]; then
        docker_cmd+=("-e" "K6_CUSTOM_HEADERS=${K6_CUSTOM_HEADERS}")
    fi

    if [[ -n "${K6_CLOUD_TOKEN:-}" ]]; then
        docker_cmd+=("-e" "K6_CLOUD_TOKEN=${K6_CLOUD_TOKEN}")
    fi

    docker_cmd+=("${K6_DOCKER_IMAGE}" "run")

    # Update output paths for Docker container
    local docker_k6_args=()
    if [[ "${OUTPUT_JSON}" == true ]]; then
        docker_k6_args+=("--out" "json=/output/results.json")
    fi
    if [[ "${OUTPUT_CSV}" == true ]]; then
        docker_k6_args+=("--out" "csv=/output/results.csv")
    fi
    if [[ "${USE_CLOUD}" == true ]]; then
        docker_k6_args+=("--out" "cloud")
    fi
    docker_k6_args+=("/scripts/$(basename "${test_script}")")

    # Run Docker command
    if "${docker_cmd[@]}" "${docker_k6_args[@]}"; then
        return 0
    else
        return 1
    fi
}

# Generate HTML report from JSON results
generate_html_report() {
    if [[ ! -f "${OUTPUT_DIR}/results.json" ]]; then
        log_warn "No JSON results found, skipping HTML report generation"
        return
    fi

    log_info "Generating HTML report..."

    # Create a simple HTML report
    cat > "${OUTPUT_DIR}/report.html" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Load Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 2px solid #7B68EE; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .metric { display: inline-block; background: #f8f9fa; padding: 15px 25px; margin: 10px; border-radius: 6px; border-left: 4px solid #7B68EE; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
        .metric-value { font-size: 24px; font-weight: bold; color: #333; }
        .pass { border-left-color: #28a745; }
        .fail { border-left-color: #dc3545; }
        .info { background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .timestamp { color: #888; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>K6 Load Test Report</h1>
        <p class="timestamp">Generated: <span id="timestamp"></span></p>

        <div class="info">
            <strong>Note:</strong> This is a basic HTML report. For detailed metrics, view the JSON or CSV output files.
        </div>

        <h2>Test Configuration</h2>
        <div class="metric">
            <div class="metric-label">Scenario</div>
            <div class="metric-value" id="scenario">-</div>
        </div>
        <div class="metric">
            <div class="metric-label">Base URL</div>
            <div class="metric-value" id="baseUrl">-</div>
        </div>

        <h2>Results</h2>
        <p>Please check the JSON results file for detailed metrics.</p>
        <p><a href="results.json">View JSON Results</a></p>
    </div>

    <script>
        document.getElementById('timestamp').textContent = new Date().toISOString();
        // URL params could be used to populate scenario/baseUrl if passed
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('scenario')) {
            document.getElementById('scenario').textContent = urlParams.get('scenario');
        }
        if (urlParams.get('baseUrl')) {
            document.getElementById('baseUrl').textContent = urlParams.get('baseUrl');
        }
    </script>
</body>
</html>
HTMLEOF

    log_success "HTML report generated: ${OUTPUT_DIR}/report.html"
}

# Print test summary
print_summary() {
    local exit_code="$1"

    echo ""
    echo "========================================"
    echo "  K6 Load Test Summary"
    echo "========================================"
    echo "  Scenario:  ${SCENARIO}"
    echo "  Base URL:  ${BASE_URL}"
    echo "  Output:    ${OUTPUT_DIR}"

    if [[ "${exit_code}" -eq 0 ]]; then
        echo -e "  Status:    ${GREEN}PASSED${NC}"
    else
        echo -e "  Status:    ${RED}FAILED${NC}"
    fi
    echo "========================================"
    echo ""

    if [[ -d "${OUTPUT_DIR}" ]]; then
        log_info "Results available in: ${OUTPUT_DIR}"
        ls -la "${OUTPUT_DIR}" 2>/dev/null || true
    fi
}

# Main function
main() {
    parse_args "$@"
    validate_scenario

    local test_script
    test_script=$(get_test_script)

    # Create output directory
    mkdir -p "${OUTPUT_DIR}"

    log_info "Starting K6 load test..."
    log_info "========================================"

    local exit_code=0

    if [[ "${USE_DOCKER}" == true ]]; then
        if ! check_docker_available; then
            log_error "Docker is not available. Please install Docker or run without --docker flag."
            exit 1
        fi
        run_k6_docker "${test_script}" || exit_code=$?
    else
        if ! check_k6_installed; then
            log_warn "k6 is not installed locally."

            if check_docker_available; then
                log_info "Docker is available. Running with Docker instead..."
                USE_DOCKER=true
                run_k6_docker "${test_script}" || exit_code=$?
            else
                log_error "Neither k6 nor Docker is available."
                log_info "Install k6: https://k6.io/docs/get-started/installation/"
                log_info "Or install Docker and use --docker flag"
                exit 1
            fi
        else
            run_k6_local "${test_script}" || exit_code=$?
        fi
    fi

    # Generate HTML report if requested
    if [[ "${OUTPUT_HTML}" == true ]]; then
        generate_html_report
    fi

    # Print summary
    print_summary "${exit_code}"

    # Handle exit based on threshold setting
    if [[ "${FAIL_ON_THRESHOLD}" == true ]]; then
        exit "${exit_code}"
    else
        exit 0
    fi
}

main "$@"
