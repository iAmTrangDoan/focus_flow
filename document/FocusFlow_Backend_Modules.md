# FocusFlow – Tổng hợp Module/Chức năng Backend cần code

**Đề tài:** Hệ thống quản lý công việc cá nhân tích hợp AI và Pomodoro (FocusFlow)
**Kiến trúc:** Modular Monolith – NestJS (TypeScript) + PostgreSQL + Socket.IO/WebSocket + Gemini AI API + Docker

Tài liệu này tổng hợp toàn bộ các module nghiệp vụ phía backend cần triển khai, mô tả chi tiết chức năng, API/nghiệp vụ chính, dữ liệu liên quan và các điều kiện ngoại lệ cần xử lý.

---

## 1. Module Auth (Xác thực & Phân quyền)

### Chức năng chính
- **Đăng ký tài khoản (Register):** nhận email + mật khẩu, kiểm tra định dạng email, độ dài mật khẩu, kiểm tra email đã tồn tại chưa. Băm mật khẩu (bcrypt/argon2) trước khi lưu. Khởi tạo tài khoản với role mặc định `USER`.
- **Đăng nhập (Login):** xác thực email/password, trả về Access Token (JWT) + Refresh Token. Refresh token được băm và lưu vào bảng `refresh_tokens` để hỗ trợ quản lý nhiều phiên đăng nhập, thu hồi token khi đăng xuất hoặc khi phát hiện bất thường.
- **Refresh Token:** cấp lại access token mới khi access token hết hạn, dựa trên refresh token hợp lệ còn trong DB.
- **Đăng xuất (Logout):** vô hiệu hóa (xóa/đánh dấu) refresh token tương ứng với phiên hiện tại.
- **Phân quyền (RBAC – Guard/Middleware):** middleware/guard kiểm tra JWT hợp lệ và vai trò (`USER`/`ADMIN`) cho từng endpoint. Đảm bảo người dùng chỉ truy cập được dữ liệu của chính mình (so khớp `userId` trong token với dữ liệu truy vấn).
- **Cập nhật thông tin cá nhân:** cho phép cập nhật `display_name`, ảnh đại diện, `timezone`.
- **Quản lý tài khoản Admin:** Admin không tự đăng ký qua form công khai; được seed/cấp quyền sẵn trong hệ thống hoặc qua API quản trị riêng.

### Dữ liệu liên quan
- Bảng `users` (id, email, password_hash, display_name, role, timezone, is_active, created_at, updated_at)
- Bảng `refresh_tokens` (token đã băm, userId, expires_at, revoked, created_at, updated_at)

### Ngoại lệ cần xử lý
- Email đã tồn tại → trả lỗi 409.
- Sai thông tin đăng nhập → 401, không tiết lộ email hay password sai.
- Token hết hạn/không hợp lệ → 401, yêu cầu đăng nhập lại.
- Tài khoản bị khóa (`is_active = false`) → từ chối đăng nhập, trả thông báo phù hợp.

---

## 2. Module Tasks (Quản lý Công việc & Subtask)

### Chức năng chính
- **Tạo task mới:** nhận tên task từ người dùng. Sau khi tạo, gọi sang **Module AI** để lấy gợi ý subtask + thời lượng ước tính (estimated duration) cho từng subtask.
- **Quản lý subtask:**
  - Hiển thị danh sách subtask gợi ý từ AI.
  - Cho phép người dùng xác nhận, chỉnh sửa nội dung/thời lượng, xóa hoặc tự thêm subtask mới.
  - Đánh dấu hoàn thành từng subtask (cập nhật tiến độ task cha).
- **Thiết lập thông số task:**
  - `deadline` (hạn chót).
  - `importance` (high/low), hệ thống suy ra Eisenhower từ 2 đầu vào: Importance (user chọn) + Urgency (tính từ deadline). User không bao giờ thấy Q1/Q2/Q3/Q4.
  - `estimated_minutes` (tổng từ các subtask hoặc nhập tay).
- **Tính Priority Score:** tự động tính điểm ưu tiên dựa trên 5 thành phần:
  PS = W1×Urgency + W2×Importance + W3×DeadlinePressure + W4×EnergyFit − W5×ProcrastRisk
  - Trọng số mặc định: W1=0.25 · W2=0.25 · W3=0.20 · W4=0.15 · W5=0.15 (có thể cấu hình bởi admin trong system_config).
  - `Urgency` – mức khẩn cấp dựa trên deadline.
  - `Importance` – mức quan trọng từ phân loại Eisenhower.
  - `DeadlinePressure` – áp lực thời gian còn lại (deadline - thời điểm hiện tại so với thời lượng còn cần).
  - `EnergyFit` – độ phù hợp giữa khung giờ thực hiện và mức năng lượng của người dùng theo khung giờ trong ngày (dựa trên `behavior_profiles`).
  - `ProcrastinationRisk` – rủi ro trì hoãn dựa trên lịch sử hành vi (từ `behavior_logs`/`behavior_profiles`).
  - Công thức tính có trọng số cấu hình được trong `system_configs` (Admin có thể điều chỉnh).
- **Bảng task board (Task Board API):** trả về danh sách task được sắp xếp theo `priority_score` giảm dần, hỗ trợ filter theo trạng thái (chưa làm/đang làm/hoàn thành), theo deadline.
- **CRUD task:** tạo, đọc, cập nhật, xóa task; đánh dấu hoàn thành toàn bộ task (tự động đánh dấu hoàn thành các subtask còn lại hoặc yêu cầu xác nhận).
- **Trigger sự kiện cho các module khác:** khi task được tạo/cập nhật/hoàn thành, phát event (nội bộ hoặc qua EventEmitter của NestJS) để Module Scheduler và Module Analytics cập nhật dữ liệu liên quan.

### Dữ liệu liên quan
- Bảng `tasks` (id, user_id, title, deadline, importance, estimated_minutes, priority_score, reschedule_count,status, completed_at, created_at, updated_at)
- Bảng `subtasks` (id, task_id, title, estimated_minutes, status: pending/skipped/cancelled(để truy vấn nhanh, nếu cần thì update sau), is_completed (cập nhật song song), created_at, completed_at, sort_order)

### Ngoại lệ cần xử lý
- Gọi AI gợi ý subtask thất bại (timeout, lỗi định dạng) → vẫn cho phép tạo task, người dùng tự nhập subtask, hệ thống log lỗi.
- Task không có deadline → vẫn tính được Priority Score (Urgency/DeadlinePressure mặc định ở mức thấp/trung bình).
- Xóa task đang có lịch trong Scheduler → cần xóa/đồng bộ luôn các `schedule_slots` liên quan.

---

## 3. Module Scheduler (Lập lịch tự động)

### Chức năng chính
- **API "Lên lịch" (Auto-scheduling):**
  - Lấy danh sách task chưa hoàn thành của người dùng kèm `priority_score`, `estimated_minutes`, `deadline`.
  - Lấy các khung giờ trống trong tuần (dựa trên `schedule_slots` hiện có + giờ làm việc cấu hình của người dùng).
  - Lấy dữ liệu hành vi (`behavior_profiles`) để xác định khung giờ người dùng có xu hướng trì hoãn → tránh xếp task vào các khung giờ này.
  - Áp dụng **Greedy Scheduling Algorithm**: ưu tiên task có `priority_score` cao và/hoặc deadline gần xếp vào các khung giờ trống tốt nhất trước.
  - Kết hợp **Pomodoro Technique**: chia mỗi task thành các phiên 25 phút làm việc + 5 phút nghỉ, xếp liên tiếp vào lịch.
- **Trả về Weekly Calendar:** danh sách `schedule_slots` theo từng ngày/giờ cụ thể, gắn với `task_id`.
- **Điều chỉnh thủ công (kéo thả):** API cập nhật thời gian bắt đầu/kết thúc của một `schedule_slot` theo yêu cầu người dùng (đổi giờ, đổi ngày).
- **Ghi nhận thay đổi lịch:** mỗi lần người dùng dời lịch thủ công, hệ thống ghi lại làm dữ liệu đầu vào cho `Reschedule Frequency` (phục vụ Procrastination Score) và cải thiện các lần lập lịch sau.
- **Đóng băng lịch khi trễ (Smart Re-scheduling):**
  - Nếu đến giờ hẹn mà người dùng chưa bấm "Start Pomodoro", slot không tự động bị đẩy lịch; chỉ đổi trạng thái sang "trễ/cảnh báo".
  - API "Tái cấu trúc một chạm": cho phép người dùng yêu cầu tính lại lịch từ thời điểm hiện tại (dời tịnh tiến các task còn lại hoặc tối ưu loại bỏ task phụ).
  - Mỗi lần gọi API tái cấu trúc → ghi +1 vào chỉ số `Reschedule Frequency` trong behavior log (Penalty Log), không phụ thuộc việc task có hoàn thành sau đó hay không.

### Dữ liệu liên quan
- Bảng `schedule_slots` (id, user_id, task_id, start_at, end_at, is_manual, is_completed, created_at, updated_at)

### Ngoại lệ cần xử lý
- Không còn khung giờ trống phù hợp trong tuần → trả về danh sách task không thể xếp được, kèm gợi ý (giảm thời lượng/đẩy sang tuần sau).
- Task có deadline đã qua nhưng chưa hoàn thành → ưu tiên xếp ngay đầu lịch, đánh dấu cảnh báo trễ hạn.
- Người dùng kéo thả slot đè lên slot khác → kiểm tra xung đột thời gian, từ chối hoặc cảnh báo.

---

## 4. Module Pomodoro (Theo dõi phiên tập trung)

### Chức năng chính
- **Bắt đầu phiên Pomodoro:** API nhận `task_id`, tạo `pomodoro_session` mới, liên kết với `schedule_slot` (nếu có), khởi tạo timer 25 phút tập trung.
- **Quản lý vòng đời phiên qua WebSocket:**
  - Phát sự kiện cập nhật thời gian còn lại theo thời gian thực (Socket.IO).
  - Khi hết 25 phút → phát thông báo chuyển sang nghỉ 5 phút; sau 4 phiên 25 phút liên tiếp → đề xuất nghỉ dài hơn 15-30 phút.
- **Tạm dừng / Hủy phiên:**
  - Tạm dừng dưới 5 phút → không tính là Drop, chỉ ghi nhận số lần tạm dừng.
  - Bấm dừng hẳn giữa chừng → ghi nhận 1 lần "Bỏ ngang" (Drop) vào behavior log.
  - Không cho phép bắt đầu phiên mới cho task đã hoàn thành (trừ khi cập nhật lại trạng thái task).
- **Khảo sát nhanh 3 giây (Quick Survey):**
  - Khi người dùng bỏ ngang hoặc hoãn task, API trả về danh sách lý do nhanh (Mệt / Task quá khó / Bị cắt ngang / Bị phân tâm) để người dùng chọn.
  - Lưu lựa chọn này vào `behavior_logs` làm dữ liệu giàu thông tin cho AI/Analytics.
- **Kết thúc phiên (hoàn thành):**
  - Ghi nhận: thời điểm bắt đầu, thời lượng thực tế, trạng thái hoàn thành, số lần tạm dừng, số lần hủy.
  - Cập nhật tiến độ task/subtask liên quan (nếu phiên gắn với subtask cụ thể).
  - Phát event để Module Analytics cập nhật `behavior_logs`/`behavior_profiles`.

### Dữ liệu liên quan
- Bảng `pomodoro_sessions` (id, user_id, task_id, started_at, ended_at, planned_duration, actual_duration, status: completed/paused/dropped, session_type:work/break,pause_count, drop_reason, created_at)

### Ngoại lệ cần xử lý
- Mất kết nối WebSocket giữa phiên → cần cơ chế đồng bộ lại trạng thái timer khi client reconnect (dựa trên `started_at` + `planned_duration` lưu ở server).
- Task liên quan bị xóa trong khi đang chạy phiên → cho phép phiên kết thúc bình thường nhưng không liên kết lại task_id (set null hoặc giữ log).

---

## 5. Module Analytics (Phân tích hành vi & Thống kê năng suất)

### Chức năng chính
- **Ghi nhận Behavior Log:** lưu lại các sự kiện hành vi theo thời gian thực (bắt đầu task trễ/đúng giờ, dời lịch, hoàn thành/bỏ ngang Pomodoro, lý do bỏ ngang từ Quick Survey...). Đây là bảng log chi tiết, không chỉ lưu trạng thái cuối.
- **Tổng hợp Behavior Profile (job định kỳ):**
  - Tính khung giờ làm việc hiệu quả nhất (dựa trên tỷ lệ hoàn thành Pomodoro theo giờ).
  - Tính khung giờ có nguy cơ trì hoãn cao (dựa trên tần suất Drop/trễ giờ).
  - Tính độ lệch giữa thời gian ước tính và thời gian thực tế (`time_duration_accuracy`).
  - Lưu vào `behavior_profiles`, dùng làm input cho `EnergyFit` (Priority Score) và Scheduler.
- **Tính Procrastination Score (cron job 00:00 hàng ngày):**
  - 5 chỉ số đầu vào:
    - `Delay Rate` – tỷ lệ task bắt đầu trễ so với lịch.
    - `Deadline Miss Rate` – tỷ lệ task không hoàn thành đúng deadline.
    - `Task Idle Days` – số ngày trung bình task tồn tại mà chưa bắt đầu.
    - `Reschedule Frequency` – số lần dời lịch trung bình mỗi task (bao gồm cả Penalty Log từ nút "Tái cấu trúc").
    - `Time Duration Accuracy` – độ lệch giữa thời gian ước tính và thời gian thực tế.
  - Tổng hợp thành điểm `procrastination_score` (0–100), lưu theo ngày vào `procrastination_scores` (lưu riêng từng thành phần để giải thích nguyên nhân tăng/giảm).
  - Phân loại trạng thái: **Tốt** (0–30), **Trung bình** (31–60), **Cần can thiệp** (61–100).
- **API thống kê cho người dùng:**
  - Lấy `procrastination_score` hiện tại + phân loại.
  - Biểu đồ `completion rate` theo tuần.
  - Heatmap hiệu suất theo khung giờ trong ngày/tuần.
  - Báo cáo so sánh năng suất tuần hiện tại vs tuần trước (weekly productivity report).
- **API thống kê cho Admin:**
  - Tổng số task tạo trong ngày.
  - Số lượng request gọi Gemini API.
  - Procrastination Score trung bình toàn hệ thống.

### Dữ liệu liên quan
- Bảng `behavior_logs` (id, user_id, event_type, related_task_id, timestamp, metadata JSONB,created_at,updated_at)
- Bảng `behavior_profiles` (id, user_id, peak_hours, risky_hours, avg_focus_rate,avg_duration_accuracy, created_at,updated_at)
- peak_hours và risky_hours lưu dạng int[]— mảng giờ trong ngày, ví dụ [8,9,10,14].
- Bảng `procrastination_scores` (id, user_id, delay_rate_value, deadline_miss_rate_value, task_idle_days_value, reschedule_frequency_value, time_duration_accuracy_value, score, level :good/average/critical, calculated_date, calculated_at,created_at,updated_at)
- procrastination_scores lưu từng lần tính. Không overwrite — append mỗi ngày để có lịch sử xu hướng. delay_rate_value, deadline_miss_rate_value... lưu breakdown từng chỉ số để frontend vẽ biểu đồ chi tiết mà không cần tính lại.
### Ngoại lệ cần xử lý
- Người dùng mới chưa có dữ liệu → API trả thông báo "chưa đủ dữ liệu" thay vì lỗi; một số chỉ số có thể null.
- Job tính điểm chạy lỗi/giờ hệ thống thay đổi → fallback hiển thị dữ liệu ngày gần nhất có sẵn.

---

## 6. Module AI (Tích hợp Gemini API)

### Chức năng chính
- **Gợi ý chia nhỏ công việc (Subtask Suggestion):**
  - Nhận tên task từ Module Tasks.
  - Gọi Gemini API với prompt chuẩn hóa, yêu cầu trả về danh sách subtask kèm `estimated_duration` (định dạng JSON cố định).
  - Parse & validate kết quả trả về (kiểm tra đúng schema JSON mong đợi).
  - Trả kết quả cho Module Tasks để hiển thị cho người dùng xác nhận/chỉnh sửa.
- **Sinh nhận xét năng suất (AI Insights – job hàng tuần):**
  - Đầu mỗi tuần, tổng hợp dữ liệu hành vi tuần trước (từ Module Analytics): khung giờ hoàn thành task, pattern trì hoãn theo loại công việc, tỷ lệ hoàn thành từng nhóm task.
  - Gửi dữ liệu đã tổng hợp lên Gemini API, yêu cầu sinh nhận xét bằng ngôn ngữ tự nhiên (tổng quan, điểm mạnh, vấn đề cần cải thiện, đề xuất hành động).
  - Lưu kết quả vào `ai_insights` dưới dạng JSONB.
- **Xử lý lỗi & retry:**
  - Timeout / API không khả dụng → fallback: lưu trạng thái "chờ xử lý" hoặc hiển thị thông báo cho người dùng, có thể retry theo cơ chế backoff.
  - Phản hồi sai định dạng JSON → log lỗi, không lưu nhận xét lỗi, trạng thái giữ "chờ xử lý".
- **Đếm số lượt gọi API:** ghi nhận số request gọi Gemini API (cho thống kê Admin).

### Dữ liệu liên quan
- Bảng `ai_insights` (id, user_id, week_start, insights JSONB: {overview, strengths, issues, suggestions}, generated_at)
- (Không có bảng riêng cho subtask suggestion – kết quả được trả trực tiếp cho Module Tasks để lưu vào `subtasks`)

| Tên trường | Kiểu dữ liệu | Mô tả |
|-----------|--------------|--------|
| `id` | `Integer` | Khóa chính, tự tăng |
| `user_id` | `Integer` | ID của user (FK tới bảng Users) |
| `week_start` | `Date` | Ngày bắt đầu tuần (thứ 2 của tuần đó) |
| `overview` | `Text` | Tổng quan ngắn gọn về tuần |
| `strengths` | `Text` | Các điểm mạnh, mặt làm tốt |
| `issues` | `Text` | Các vấn đề, điểm cần cải thiện |
| `suggestions` | `Text` | Các đề xuất, lời khuyên |
| `generated_at` | `Timestamp` | Thời điểm tạo insights |

### Ngoại lệ cần xử lý
- Gemini API trả về nội dung không đúng cấu trúc JSON yêu cầu → parser bắt lỗi, không làm crash flow tạo task.
- Người dùng chưa có đủ dữ liệu hành vi tuần trước → không gọi AI, trả trạng thái "chưa đủ dữ liệu" trong `ai_insights`.

---

## 7. Module Notification (Thông báo)

### Chức năng chính
- **Thông báo Pomodoro:** gửi thông báo (qua WebSocket) khi hết phiên tập trung/nghỉ, nhắc người dùng chuyển giai đoạn.
- **Thông báo lịch trình:**
  - Nhắc nhở khi đến giờ task theo `schedule_slots`.
  - Cảnh báo khi slot bị "đóng băng" do người dùng chưa bắt đầu Pomodoro đúng giờ (đổi màu/trạng thái cảnh báo nhẹ).
- **Thông báo AI Insights:** báo cho người dùng khi có nhận xét AI mới mỗi đầu tuần.
- **Cấu hình thời điểm gửi reminder:** đọc tham số `reminder_time` từ `system_configs` (Admin cấu hình) để xác định lịch gửi nhắc nhở định kỳ.
- **Kênh gửi:** trong phạm vi đề tài, chủ yếu qua WebSocket/in-app notification (không bao gồm email/SMS).

### Dữ liệu liên quan
- Không có bảng riêng bắt buộc (có thể bổ sung bảng `notifications` nếu cần lưu lịch sử thông báo); chủ yếu là các event phát qua WebSocket Gateway dựa trên dữ liệu từ `schedule_slots`, `pomodoro_sessions`, `ai_insights`.

### Ngoại lệ cần xử lý
- Client offline khi sự kiện được phát → cần cơ chế "catch-up" khi client kết nối lại (truy vấn lại trạng thái hiện tại từ DB thay vì chỉ dựa vào event).

---

## 8. Module Admin (Quản trị hệ thống)

### Chức năng chính
- **Quản lý người dùng:**
  - Xem danh sách toàn bộ user, tra cứu thông tin/trạng thái tài khoản.
  - Khóa/mở khóa tài khoản (`is_active`), người dùng bị khóa không thể truy cập các chức năng nghiệp vụ.
- **Giám sát hệ thống (Dashboard tổng quan):**
  - Tổng số task được tạo trong ngày.
  - Số lượng request gọi Gemini API.
  - Procrastination Score trung bình toàn hệ thống.
- **Cấu hình tham số hệ thống (`system_configs`):**
  - Trọng số công thức Priority Score (Urgency, Importance, DeadlinePressure, EnergyFit, ProcrastinationRisk).
  - Tham số công thức Procrastination Score.
  - Cấu hình Pomodoro mặc định (thời lượng tập trung/nghỉ).
  - Thời điểm chạy cron job (giờ tính Procrastination Score, giờ sinh AI Insights, giờ gửi reminder).
  - Giới hạn số lượt gọi Gemini API (nếu áp dụng).
  - Validate giá trị cấu hình trước khi lưu; nếu không hợp lệ → không lưu, trả lỗi rõ ràng.

### Dữ liệu liên quan
- Bảng `system_configs` (key, value, description, updated_at, updated_by)
- Sử dụng chung bảng `users`, `tasks`, `ai_insights`, `procrastination_scores` để tính thống kê tổng quan.

### Ngoại lệ cần xử lý
- Cấu hình không hợp lệ (giá trị âm, tổng trọng số không hợp lý...) → từ chối lưu, trả thông báo lỗi cụ thể.
- Khóa tài khoản đang có session hoạt động → các request tiếp theo của user đó bị từ chối ngay (kiểm tra `is_active` trong Auth Guard).

---

## 9. Cron Jobs / Scheduled Tasks (Liên module)

| Job | Mô tả | Module liên quan |
| --- | --- | --- |
| Tính Procrastination Score | Chạy 00:00 hàng ngày, tính điểm trì hoãn cho từng user dựa trên 5 chỉ số | Analytics |
| Tổng hợp Behavior Profile | Cập nhật định kỳ (hàng ngày/giờ thấp điểm) khung giờ hiệu quả & nguy cơ trì hoãn | Analytics |
| Sinh AI Insights hàng tuần | Đầu mỗi tuần, tổng hợp dữ liệu tuần trước và gọi Gemini API sinh nhận xét | AI + Analytics |
| Gửi Reminder | Theo `reminder_time` cấu hình, gửi nhắc nhở task/lịch trình | Notification |
| Đóng băng / cảnh báo slot trễ | Kiểm tra các `schedule_slots` đã qua giờ nhưng chưa Start Pomodoro | Scheduler + Notification |

Tất cả thời điểm chạy cron job đều có thể được Admin cấu hình qua `system_configs`.

---

## 10. Tổng hợp các bảng dữ liệu chính (PostgreSQL)

| Nhóm | Bảng |
| --- | --- |
| User & Authentication | `users`, `refresh_tokens` |
| Task Management | `tasks`, `subtasks` |
| Scheduling | `schedule_slots` |
| Pomodoro | `pomodoro_sessions` |
| Behavior Analytics | `behavior_logs`, `behavior_profiles` |
| Productivity Analytics | `procrastination_scores` |
| AI Insights | `ai_insights` |
| System Configuration | `system_configs` |

Tổng cộng 11 bảng theo thiết kế CSDL đã mô tả trong báo cáo tuần 03.

---

## 11. Sơ đồ phụ thuộc giữa các module (tổng quan)

- **Auth** là tầng nền, mọi module khác đều phụ thuộc vào Auth Guard để xác thực/phân quyền.
- **Tasks** là nguồn dữ liệu trung tâm: gọi **AI** để gợi ý subtask, cung cấp dữ liệu cho **Scheduler** (lập lịch) và **Analytics** (tính toán hành vi/điểm số).
- **Scheduler** đọc dữ liệu từ **Tasks** + **Analytics** (behavior_profiles) để lập lịch, và ghi lại hành vi dời lịch về **Analytics**.
- **Pomodoro** liên kết với **Tasks**/**Scheduler** khi chạy phiên, ghi log về **Analytics**, phát sự kiện realtime qua **Notification**.
- **Analytics** tổng hợp dữ liệu từ Tasks/Scheduler/Pomodoro để tính Procrastination Score và cung cấp input cho Priority Score (qua Tasks) và Scheduler.
- **AI** dùng dữ liệu tổng hợp từ **Analytics** để sinh AI Insights, và hỗ trợ **Tasks** trong việc gợi ý subtask.
- **Admin** có quyền đọc/ghi `system_configs` ảnh hưởng đến công thức tính của **Tasks** (Priority Score) và **Analytics** (Procrastination Score), cũng như thời điểm chạy cron job của **Notification**/**AI**/**Analytics**.
- **Notification** lắng nghe sự kiện từ Scheduler, Pomodoro, AI để gửi thông báo realtime qua WebSocket Gateway.
