## Danh sách API FocusFlow

### 1. Auth Module
Method | Endpoint | Mô tả 
---|---|---
POST | /api/auth/register | Đăng ký tài khoản mới (email, password)
POST | /api/auth/login | Đăng nhập, trả về access token + refresh token
POST | /api/auth/refresh | Cấp lại access token từ refresh token
POST | /api/auth/logout | Đăng xuất, vô hiệu hóa refresh token
GET | /api/users/me | Lấy thông tin cá nhân người dùng hiện tại
PATCH | /api/users/me | Cập nhật display_name, avatar, timezone

### 2. Task Management Module
Method | Endpoint | Mô tả 
---|---|---
GET | /api/tasks | Lấy danh sách task của user (lọc theo status, ưu tiên, deadline)
POST | /api/tasks | Tạo task mới (tên task)
GET | /api/tasks/:id | Xem chi tiết task kèm subtasks
PATCH | /api/tasks/:id | Cập nhật task (deadline, mức ưu tiên Eisenhower, mô tả...)
DELETE | /api/tasks/:id | Xóa task
PATCH | /api/tasks/:id/complete | Đánh dấu hoàn thành task
POST | /api/tasks/:id/suggest-subtasks | Gọi Gemini API gợi ý danh sách subtask + estimate duration
GET | /api/tasks/:id/subtasks | Lấy danh sách subtask của task
POST | /api/tasks/:id/subtasks | Thêm subtask mới (thủ công)
PATCH | /api/subtasks/:id | Cập nhật subtask (tên, thời lượng ước tính)
PATCH | /api/subtasks/:id/complete | Đánh dấu hoàn thành subtask
DELETE | /api/subtasks/:id | Xóa subtask
GET | /api/tasks/:id/priority-score | Lấy chi tiết Priority Score (Urgency, Importance, DeadlinePressure, EnergyFit, ProcrastinationRisk)

### 3. Scheduler Module
Method | Endpoint | Mô tả 
---|---|---
POST | /api/schedule/generate | Kích hoạt thuật toán Greedy Scheduling tạo lịch tuần
GET | /api/schedule/weekly | Lấy lịch tuần hiện tại (dạng calendar)
GET | /api/schedule/slots | Lấy danh sách schedule_slots (lọc theo khoảng ngày)
PATCH | /api/schedule/slots/:id | Cập nhật slot (kéo thả: đổi ngày/giờ)
DELETE | /api/schedule/slots/:id | Xóa slot khỏi lịch
POST | /api/schedule/slots/:id/restructure | Tái cấu trúc một chạm (recompute từ thời điểm hiện tại, +1 Reschedule Frequency)

### 4. Pomodoro Module
Method | Endpoint | Mô tả 
---|---|---
POST | /api/pomodoro/sessions | Bắt đầu phiên Pomodoro mới (gắn task_id)
PATCH | /api/pomodoro/sessions/:id/pause | Tạm dừng phiên
PATCH | /api/pomodoro/sessions/:id/resume | Tiếp tục phiên sau khi tạm dừng
PATCH | /api/pomodoro/sessions/:id/complete | Hoàn thành phiên (ghi nhận thời lượng thực tế)
PATCH | /api/pomodoro/sessions/:id/cancel | Hủy/bỏ ngang phiên (Drop)
POST | /api/pomodoro/sessions/:id/quick-feedback | Gửi khảo sát nhanh 3 giây (lý do bỏ ngang/hoãn)
GET | /api/pomodoro/sessions | Lấy lịch sử các phiên Pomodoro
GET | /api/pomodoro/sessions/current | Lấy phiên đang hoạt động (nếu có)

### 5. Analytics Module
Method | Endpoint | Mô tả 
---|---|---
GET | /api/analytics/procrastination-score | Lấy Procrastination Score hiện tại + phân loại (Tốt/TB/Cần can thiệp)
GET | /api/analytics/procrastination-score/history | Lịch sử điểm trì hoãn theo ngày
GET | /api/analytics/completion-rate | Tỷ lệ hoàn thành task theo tuần
GET | /api/analytics/heatmap | Heatmap hiệu suất theo khung giờ trong ngày
GET | /api/analytics/weekly-report | Báo cáo năng suất hàng tuần (so sánh tuần trước)
GET | /api/behavior-logs | Lấy behavior logs (lọc theo loại sự kiện, khoảng thời gian)

### 6. AI Insights Module
Method | Endpoint | Mô tả 
---|---|---
GET | /api/ai-insights | Lấy danh sách nhận xét AI theo tuần
GET | /api/ai-insights/:id | Xem chi tiết một nhận xét (tổng quan, điểm mạnh, đề xuất)
POST | /api/ai-insights/generate | (Admin/Cron) Kích hoạt tạo nhận xét AI cho tuần hiện tại

### 7. Notification Module
Method | Endpoint | Mô tả 
---|---|---
GET | /api/notifications | Lấy danh sách thông báo
PATCH | /api/notifications/:id/read | Đánh dấu đã đọc
WS | /ws/notifications | WebSocket kênh nhận thông báo realtime

### 8. WebSocket Gateway (Realtime)
Event | Hướng | Mô tả 
---|---|---
pomodoro:tick | Server → Client | Cập nhật đồng hồ đếm ngược mỗi giây
pomodoro:phase-change | Server → Client | Chuyển giai đoạn (Focus ↔ Break)
schedule:locked | Server → Client | Lịch bị "đóng băng" khi trễ giờ
notification:new | Server → Client | Thông báo mới

### 9. Admin Module
Method | Endpoint | Mô tả 
---|---|---
GET | /api/admin/users | Danh sách toàn bộ user
GET | /api/admin/users/:id | Xem chi tiết + trạng thái tài khoản
PATCH | /api/admin/users/:id/lock | Khóa/mở khóa tài khoản
GET | /api/admin/dashboard | Chỉ số tổng quan (số task/ngày, số lượt gọi Gemini API, Procrastination Score trung bình hệ thống)
GET | /api/admin/configs | Lấy cấu hình hệ thống (trọng số Priority Score, cron time...)
PATCH | /api/admin/configs | Cập nhật cấu hình (validate trước khi lưu)

## Quy tắc chung: 
- Tất cả endpoint (trừ /auth/register, /auth/login, /auth/refresh) yêu cầu header Authorization: Bearer <access_token>; 
- Route /api/admin/* yêu cầu role = ADMIN; 
- Lỗi trả về theo format thống nhất { statusCode, message, error }