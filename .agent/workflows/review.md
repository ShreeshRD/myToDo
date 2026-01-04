---
description: Comprehensive code review workflow for frontend and backend
---

# Code Review Workflow

This workflow performs a comprehensive review of the codebase, checking for code quality, modularity, framework best practices, and unused code.

## Steps

### 1. Check File Sizes and Modularity

Scan all code files to identify files larger than 300 lines that need to be modularized.

```bash
find frontend-next -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) -exec wc -l {} + | awk '$1 > 300 {print $2, "(" $1, "lines)"}' | sort -t'(' -k2 -rn
find backend-springboot -type f \( -name "*.java" \) -exec wc -l {} + | awk '$1 > 300 {print $2, "(" $1, "lines)"}' | sort -t'(' -k2 -rn
```

**Action Items to Document:**
- List all files exceeding 300 lines
- For each file, suggest logical component/module splits
- Identify which functions/classes should be extracted

### 2. Review Frontend (Next.js Standards)

Review the Next.js frontend code against industry best practices:

**a) Project Structure:**
- Verify proper use of `app/` or `pages/` directory structure
- Check for proper organization of components, utilities, and hooks
- Ensure API routes follow Next.js conventions

**b) Performance & Optimization:**
- Check for proper use of `next/image` instead of `<img>` tags
- Verify dynamic imports for code splitting where appropriate
- Review use of `next/link` for client-side navigation
- Check for proper metadata/SEO implementation

**c) React Best Practices:**
- Verify proper use of React hooks (no hooks in conditionals/loops)
- Check for unnecessary re-renders (missing `useMemo`, `useCallback`)
- Review state management patterns
- Ensure proper error boundaries exist

**d) Code Quality:**
- Check for proper TypeScript usage (if applicable)
- Verify PropTypes or TypeScript interfaces for components
- Review ESLint warnings and errors
- Check for console.log statements that should be removed

**e) Data Fetching:**
- Verify proper use of Server Components vs Client Components
- Check for appropriate use of `getServerSideProps`, `getStaticProps`, or App Router data fetching
- Review API call patterns and error handling

**Action Items to Document:**
- List all violations of Next.js best practices
- Provide specific file locations and line numbers
- Suggest concrete improvements for each issue

### 3. Review Backend (Spring Boot Standards)

Review the Spring Boot backend code against industry best practices:

**a) Project Structure:**
- Verify proper package organization (controller, service, repository, model/entity, dto, config)
- Check for proper separation of concerns
- Ensure configuration files follow conventions

**b) Annotations & Configuration:**
- Verify proper use of `@RestController`, `@Service`, `@Repository`, `@Component`
- Check for appropriate use of `@Transactional`
- Review `@RequestMapping` patterns and HTTP method annotations
- Verify proper validation annotations (`@Valid`, `@NotNull`, etc.)

**c) REST API Design:**
- Check for RESTful endpoint naming conventions
- Verify proper HTTP status code usage
- Review request/response DTO patterns
- Check for proper exception handling with `@ExceptionHandler` or `@ControllerAdvice`

**d) Database & JPA:**
- Review entity relationships and mappings
- Check for proper use of cascade types and fetch strategies
- Verify query optimization (N+1 query problems)
- Review transaction boundaries

**e) Security:**
- Check for SQL injection vulnerabilities
- Verify input validation
- Review CORS configuration
- Check for sensitive data exposure in logs/responses

**f) Code Quality:**
- Review dependency injection patterns
- Check for proper use of interfaces and abstractions
- Verify error handling and logging
- Look for hardcoded values that should be in application.properties

**Action Items to Document:**
- List all violations of Spring Boot best practices
- Provide specific file locations and line numbers
- Suggest concrete improvements for each issue

### 4. Identify Unused/Redundant Code

Search for code that may be unused or redundant:

**a) Dead Code Detection:**
- Look for unused imports
- Find unused variables and functions
- Identify unreachable code blocks
- Find commented-out code blocks

**b) Duplication Detection:**
- Identify duplicated logic across files
- Find similar functions that could be consolidated
- Look for repeated string literals that should be constants
- Identify similar components that could be unified

**c) Unused Dependencies:**
- Review `package.json` for unused npm packages
- Review `pom.xml` for unused Maven dependencies

**d) Check Build Warnings:**
```bash
cd frontend-next && npm run build 2>&1 | tee /tmp/frontend-build.log
cd backend-springboot && ./mvnw clean compile 2>&1 | tee /tmp/backend-build.log
```

**Action Items to Document:**
- List all unused or redundant code with file locations
- Identify safe-to-remove code vs code that needs investigation
- List unused dependencies
- Document any build warnings

### 5. Create Actionable Review Document

Compile all findings into a structured review document at `/home/agent/projects/myToDo/.agent/code_review_results.md`

**Document Structure:**

```markdown
# Code Review Results
Date: [Current Date]

## Executive Summary
- Total files reviewed: X
- Critical issues: Y
- Warnings: Z
- Files needing modularization: N

## 1. Modularity Issues

### Files Exceeding 300 Lines
- [ ] `path/to/file.js` (450 lines)
  - Extract: [Specific function/component names]
  - Suggested new files: [file1.js, file2.js]
  
## 2. Frontend (Next.js) Issues

### Critical
- [ ] Issue description
  - File: `path/to/file.js:line`
  - Problem: [Description]
  - Solution: [Specific fix]

### Warnings
- [ ] Issue description
  - File: `path/to/file.js:line`
  - Problem: [Description]
  - Solution: [Specific fix]

## 3. Backend (Spring Boot) Issues

### Critical
- [ ] Issue description
  - File: `path/to/file.java:line`
  - Problem: [Description]
  - Solution: [Specific fix]

### Warnings
- [ ] Issue description
  - File: `path/to/file.java:line`
  - Problem: [Description]
  - Solution: [Specific fix]

## 4. Unused/Redundant Code

### Dead Code
- [ ] `path/to/file:line` - Unused function: [name]
- [ ] `path/to/file:line` - Commented code block

### Duplicated Code
- [ ] Duplication between:
  - `file1.js:lines`
  - `file2.js:lines`
  - Suggested refactor: [Description]

### Unused Dependencies
- [ ] Package: [name] - Found in: [package.json/pom.xml]

## 5. Priority Action Items

### High Priority (Must Fix)
1. [ ] [Specific actionable task]
2. [ ] [Specific actionable task]

### Medium Priority (Should Fix)
1. [ ] [Specific actionable task]
2. [ ] [Specific actionable task]

### Low Priority (Nice to Have)
1. [ ] [Specific actionable task]
2. [ ] [Specific actionable task]

## Implementation Notes
- Each item should be a self-contained task
- Items are ordered by priority and dependencies
- Estimated effort is provided where applicable
```

### 6. Final Checklist

Before completing the review:
- [ ] All files have been scanned for size violations
- [ ] Frontend code reviewed against Next.js standards
- [ ] Backend code reviewed against Spring Boot standards
- [ ] Unused/redundant code identified
- [ ] Review document created with actionable items
- [ ] All issues include file paths and line numbers
- [ ] All issues include specific solutions
- [ ] Items are prioritized and grouped logically
