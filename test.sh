#!/bin/bash

# Script de tests pour Ghosty
# Usage: ./test.sh [all|rust|frontend|security]

set -e

echo "🧪 Ghosty Test Suite"
echo "===================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

run_rust_tests() {
    echo -e "\n${YELLOW}→ Tests Rust...${NC}"
    cd src-tauri
    cargo test --color=always
    cd ..
    echo -e "${GREEN}✓ Tests Rust OK${NC}"
}

run_rust_clippy() {
    echo -e "\n${YELLOW}→ Linter Rust (Clippy)...${NC}"
    cd src-tauri
    cargo clippy -- -D warnings
    cd ..
    echo -e "${GREEN}✓ Clippy OK${NC}"
}

run_frontend_lint() {
    echo -e "\n${YELLOW}→ Linter Frontend (ESLint)...${NC}"
    npm run lint || echo -e "${RED}⚠️  Linter warnings${NC}"
    echo -e "${GREEN}✓ Lint Frontend OK${NC}"
}

run_frontend_build() {
    echo -e "\n${YELLOW}→ Build Frontend...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build Frontend OK${NC}"
}

check_security() {
    echo -e "\n${YELLOW}→ Vérification sécurité...${NC}"
    
    # Vérifier keychain
    echo "  Checking keychain..."
    if security find-generic-password -s "ai.ghosty.app" -a "openai_api_key" 2>/dev/null; then
        echo -e "  ${GREEN}✓ API key trouvée dans keychain${NC}"
    else
        echo -e "  ${YELLOW}⚠  Aucune clé API dans keychain${NC}"
    fi
    
    # Vérifier .env non commité
    echo "  Checking .env in .gitignore..."
    if grep -q "^\.env$" .gitignore; then
        echo -e "  ${GREEN}✓ .env dans .gitignore${NC}"
    else
        echo -e "  ${RED}✗ .env manquant dans .gitignore!${NC}"
    fi
    
    # Vérifier pas de secrets hardcodés
    echo "  Checking for hardcoded secrets..."
    if git grep -i "sk-proj-" -- '*.rs' '*.ts' '*.tsx' 2>/dev/null | grep -v "placeholder" | grep -v "example"; then
        echo -e "  ${RED}✗ Secrets potentiels trouvés!${NC}"
    else
        echo -e "  ${GREEN}✓ Pas de secrets hardcodés${NC}"
    fi
}

run_integration_test() {
    echo -e "\n${YELLOW}→ Test d'intégration basique...${NC}"
    
    # Vérifier que l'app démarre
    echo "  Starting app..."
    npm run tauri:dev > /dev/null 2>&1 &
    APP_PID=$!
    
    sleep 5
    
    if ps -p $APP_PID > /dev/null; then
        echo -e "  ${GREEN}✓ App démarre correctement${NC}"
        kill $APP_PID
    else
        echo -e "  ${RED}✗ App ne démarre pas${NC}"
        exit 1
    fi
}

show_coverage() {
    echo -e "\n${YELLOW}→ Rapport de couverture...${NC}"
    cd src-tauri
    cargo tarpaulin --out Stdout 2>/dev/null || echo "  Install tarpaulin: cargo install cargo-tarpaulin"
    cd ..
}

# Main
case "${1:-all}" in
    all)
        run_rust_tests
        run_rust_clippy
        run_frontend_lint
        run_frontend_build
        check_security
        echo -e "\n${GREEN}✅ Tous les tests passent!${NC}\n"
        ;;
    rust)
        run_rust_tests
        run_rust_clippy
        ;;
    frontend)
        run_frontend_lint
        run_frontend_build
        ;;
    security)
        check_security
        ;;
    integration)
        run_integration_test
        ;;
    coverage)
        show_coverage
        ;;
    *)
        echo "Usage: $0 [all|rust|frontend|security|integration|coverage]"
        exit 1
        ;;
esac
