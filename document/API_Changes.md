# FocusFlow – API Changes Log

Tài liệu này ghi lại những thay đổi so với thiết kế API ban đầu trong `APIs.md`.

---

## Thay đổi Endpoints

| Endpoint gốc | Endpoint mới | Lý do |
|---|---|---|
| `POST /api/schedule/slots/:id/restructure` | `POST /api/schedule/restructure` | Tái cấu trúc là tính lại **toàn bộ lịch** từ thời điểm hiện tại, không phải cho 1 slot riêng lẻ |
| `PATCH /api/admin/users/:id/lock` | `PATCH /api/admin/users/:id/toggle-active` | Rõ nghĩa hơn — toggle trạng thái `isActive` (khóa ↔ mở khóa) |
| `GET /api/tasks/:id/priority-score` | *(Bỏ — gộp vào `GET /api/tasks/:id`)* | Priority score + breakdown đã nằm trong response chi tiết task, tách endpoint riêng thêm complexity không cần thiết |

## Thay đổi Schema / Enum

| Thay đổi | Chi tiết |
|---|---|
| Bỏ `EisenhowerQuadrant` enum | User chọn `Importance` (HIGH/LOW), hệ thống tự suy Eisenhower từ importance + deadline. Không cần enum Q1-Q4 trong DB |
| Thêm `Importance` enum | `HIGH` / `LOW` — input trực tiếp từ user |
| Thêm `FocusMode` enum | `STANDARD` (25 work + 5 break) / `DEEP_FOCUS` (50 work + 10 break) — cho phép user chọn chế độ tập trung sâu |
| Thêm `IN_PROGRESS` vào `PomodoroStatus` | Schema cũ thiếu trạng thái "đang chạy" — cần thiết cho lifecycle quản lý phiên |
| Thêm `PomodoroSessionType` enum | `WORK` / `BREAK` — phân biệt phiên tập trung vs nghỉ |
| Thêm `description` field cho `Task` | Cho phép user mô tả chi tiết task |
| Thêm `focusMode` field cho `Task` | Mỗi task có thể set chế độ pomodoro riêng |

## Thay đổi Business Logic

| Thay đổi | Chi tiết |
|---|---|
| Scheduling theo subtask | Nếu task có subtask → chia pomodoro slots theo từng subtask; nếu không → chia theo estimatedMinutes của task |
| EnergyFit & ProcrastinationRisk mặc định = 5 | Chưa có Analytics module → dùng giá trị trung lập. Sẽ cập nhật khi implement Analytics |
| Auto-complete task khi tất cả subtask xong | Khi subtask cuối cùng được hoàn thành → task tự động chuyển DONE |
| Chỉ cho phép 1 phiên Pomodoro active | Không thể start phiên mới khi đang có phiên IN_PROGRESS |
| Admin config validate tổng trọng số | Khi cập nhật trọng số Priority/Procrastination Score, validate sum ≈ 1 |

## Endpoints chưa implement (ngoài scope)

| Endpoint | Module | Lý do |
|---|---|---|
| `POST /api/tasks/:id/suggest-subtasks` | AI | Thuộc Module AI — cần Gemini API integration |
| Analytics endpoints (`/api/analytics/*`) | Analytics | Module riêng — cần implement behavior_logs, behavior_profiles, procrastination_scores |
| AI Insights endpoints (`/api/ai-insights/*`) | AI | Module riêng — cần Gemini API |
| Notification/WebSocket endpoints | Notification | Module riêng — cần WebSocket Gateway |
