#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build mAgri-like platform based on https://magri.africa/en with scope: (1) AI Usage Billing tied to tokens with Orange API (MOCKED), (2) Content/rendering fixes (markdown, tables, links), (3) Internal visibility/analytics (daily signups, AI logs, course completion, GA4), (4) SEO (sitemap.xml, robots.txt, canonical, JSON-LD, semantic HTML). LLM: Claude Sonnet 4.5 vision via Emergent LLM key. Currency: BWP (Botswana Pula).

backend:
  - task: "Auth (signup/login/logout/me) with session cookie"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Manually verified via curl: signup creates user with BWP 50 starting balance, login sets httpOnly cookie, /api/me returns user. Admin user seeded (admin@magri.africa / admin123)."

  - task: "AI Diagnose endpoint (Claude Sonnet 4.5 vision) with token tracking & wallet debit"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js + /app/lib/llm_helper.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Python helper spawned from Next.js via /root/.venv/bin/python3. Monkey-patches LlmChat._execute_completion to capture litellm usage (prompt_tokens, completion_tokens). Returns JSON with tokens. Verified real call: 158 input + 555 output tokens, cost BWP 0.2933, balance correctly debited from 149.72 to 149.43. Supports image_base64. Retries x2 on failure. Logs to usage_logs with status debited/underfunded/failed."

  - task: "Orange Money billing (MOCKED) - topup, poll, retry, reconciliation"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/billing/topup creates pending tx with scheduled outcome (10% fake fail rate). GET /api/billing/tx/:id auto-advances after 3-5s. POST /api/billing/retry/:id for failed. POST /api/admin/reconcile marks stuck pending>10min as failed. Verified: 100 BWP topup, pending->success auto-transition, balance credited."

  - task: "Blog/Courses/Insights CRUD & enrollment"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Seeded 3 blog posts (markdown w/ tables+links), 3 courses, 3 farmer insights. Enrollment + completion with certificate UUID."

  - task: "Admin analytics"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/admin/analytics returns KPIs (total_users=2, ai_calls=1, revenue=100 BWP, completions, failed/pending topups), daily signups, daily AI usage, daily revenue, top users, recent logs. Admin-only via is_admin flag."

  - task: "SEO: sitemap.xml, robots.txt, canonical, JSON-LD, OG tags"
    implemented: true
    working: true
    file: "/app/app/sitemap.js + /app/app/robots.js + /app/app/blog/[slug]/page.js + /app/app/layout.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Sitemap includes /, static view params, and all blog slugs dynamically from DB. Robots.txt with disallow /api/ and /admin. Blog detail route (server component) emits canonical, OG, Twitter cards, JSON-LD BlogPosting. Layout emits Organization + WebSite JSON-LD + GA4 tag."

frontend:
  - task: "Full SPA UI (home, diagnose chat, wallet, courses, blog, admin)"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "mAgri-inspired green palette, hero with real tagline, AI Diagnose chat with image upload + token/cost badges per message, wallet with Orange Money mocked checkout modal (pending->success/failed with retry), courses grid with enroll/complete, blog grid linking to /blog/[slug], admin dashboard with recharts (bar+line charts). Awaiting user permission for frontend automated testing."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "AI Diagnose endpoint with Claude vision + token tracking"
    - "Orange Money mocked topup/retry"
    - "Admin analytics"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "MVP complete. All 4 scope-of-work areas shipped: (1) AI Billing with real token tracking + mocked Orange Money, (2) Content rendering with react-markdown+remark-gfm tables/links, (3) Admin analytics dashboard + GA4, (4) SEO sitemap/robots/canonical/JSON-LD. Manual curl testing passed for auth, diagnose (real Claude call, 158/555 tokens, BWP 0.29 debited), topup flow (pending->success), admin analytics, sitemap.xml, robots.txt, and blog detail SSR with schema.org markup."
