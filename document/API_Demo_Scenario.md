# Kịch Bản Demo Hệ Thống FocusFlow (API Backend Only)

Tài liệu này hướng dẫn chi tiết các bước chạy thử nghiệm (demo) toàn bộ các chức năng đã được xây dựng API trong hệ thống **FocusFlow** bằng công cụ dòng lệnh `curl` (hoặc có thể import vào Postman / Thunder Client).

---

## I. Chuẩn bị Môi trường Demo

### 1. Khởi động Backend
Mở terminal tại thư mục dự án và khởi động backend:
```bash
cd backend
npm run start:dev
```
*Mặc định, server sẽ chạy tại địa chỉ: `http://localhost:3000` với tiền tố API là `/api`.*
*Tài liệu Swagger API Docs có thể truy cập tại: `http://localhost:3000/api/docs`.*

### 2. Thiết lập Dữ liệu Cấu hình Hệ thống (Weights Seed)
Để khởi tạo các trọng số tính điểm ưu tiên (Priority Score) và cấu hình thời gian Pomodoro mặc định:
```bash
npx prisma db seed
```

### 3. Chuẩn bị Tài khoản Admin để Demo
Vì API đăng ký (`/api/auth/register`) mặc định gán role là `USER` để đảm bảo bảo mật, ta sẽ tạo tài khoản Admin bằng cách:
1. Đăng ký một tài khoản bình thường (ví dụ: `admin@focusflow.com`).
2. Mở Prisma Studio để đổi quyền trực tiếp từ DB:
   ```bash
   npx prisma studio
   ```
3. Truy cập bảng **users**, tìm email `admin@focusflow.com` và đổi giá trị cột `role` từ `USER` thành `ADMIN`, sau đó lưu lại (Save 1 change).

---

## II. Các Bước Thực Hiện Kịch Bản Demo

### Mẹo thực hiện nhanh:
> [!NOTE]
> Bạn có thể khai báo biến môi trường trong Terminal để tái sử dụng token và ID:
> - **Windows (PowerShell):** `$token = "access_token_nhan_duoc"`; đầu header truyền `${token}`.
> - **Linux/macOS (Bash):** `export TOKEN="access_token_nhan_duoc"`.

---

### KỊCH BẢN 1: QUẢN LÝ TÀI KHOẢN & XÁC THỰC (AUTH API)

Mục đích: Demo quy trình đăng ký, đăng nhập, bảo mật JWT và cơ chế xoay vòng Refresh Token (Token Rotation).

#### Bước 1.1: Đăng ký tài khoản mới (User)
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo.user@focusflow.com",
    "password": "password123",
    "displayName": "Demo User"
  }'
```
* **Kết quả kỳ vọng (201 Created):** Trả về thông tin user (đã ẩn mật khẩu) kèm theo cặp `accessToken` và `refreshToken`.

#### Bước 1.2: Đăng ký tài khoản để làm Admin
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@focusflow.com",
    "password": "adminpassword",
    "displayName": "System Admin"
  }'
```
* *Sau bước này, thực hiện đổi vai trò của `admin@focusflow.com` thành `ADMIN` thông qua Prisma Studio như mục I.3.*

#### Bước 1.3: Đăng nhập hệ thống
Đăng nhập bằng tài khoản User vừa tạo để lấy `accessToken` hoạt động:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo.user@focusflow.com",
    "password": "password123"
  }'
```
* **Kết quả kỳ vọng (200 OK):** Trả về thông tin đăng nhập và cặp tokens mới. Hãy lưu lại `accessToken` (để gọi các API sau) và `refreshToken`.

#### Bước 1.4: Lấy thông tin tài khoản hiện tại (Get Me)
Kiểm tra tính hợp lệ của access token:
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về chi tiết thông tin user đang đăng nhập.

#### Bước 1.5: Cấp lại Access Token mới bằng Refresh Token
Mô phỏng khi access token hết hạn (15 phút), client dùng refresh token để lấy token mới:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer <REFRESH_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về cặp `accessToken` và `refreshToken` mới. Token cũ sẽ bị thu hồi (revoke) để tránh tấn công phát lại (Replay Attack).

---

### KỊCH BẢN 2: QUẢN LÝ CÔNG VIỆC & SUBTASKS (TASKS API)

Mục đích: Tạo công việc, kiểm chứng cơ chế **Tự động tính điểm ưu tiên (Priority Score)** dựa trên ma trận Eisenhower và thời lượng còn lại (Deadline Pressure), quản lý các công việc con (Subtasks).

#### Bước 2.1: Tạo các công việc với thuộc tính khác nhau để kiểm tra cách tính điểm
Tạo **Task A** (Quan trọng, thời gian gấp, chế độ Deep Focus):
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hoàn thiện API FocusFlow",
    "description": "Lập trình các endpoint backend và viết unit test",
    "deadline": "2026-06-18T17:00:00Z",
    "importance": "HIGH",
    "focusMode": "DEEP_FOCUS",
    "estimatedMinutes": 120
  }'
```
*(Lưu lại `taskId` của Task A từ kết quả trả về)*

Tạo **Task B** (Ít quan trọng hơn, deadline xa hơn):
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Đọc tài liệu NextJS",
    "description": "Nghiên cứu cơ chế App Router và Server Component",
    "deadline": "2026-06-25T17:00:00Z",
    "importance": "LOW",
    "focusMode": "STANDARD",
    "estimatedMinutes": 60
  }'
```

#### Bước 2.2: Lấy danh sách Tasks (Sắp xếp theo Priority Score)
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về danh sách tasks. Bạn sẽ thấy **Task A** có `priorityScore` cao hơn **Task B** và được xếp lên đầu danh sách. 
* **Giải thích thuật toán:** Hệ thống tự động tính điểm theo công thức: 
  `PS = w1*Urgency + w2*Importance + w3*DeadlinePressure + w4*EnergyFit + w5*ProcrastinationRisk`.

#### Bước 2.3: Xem chi tiết Task A kèm phân tích cấu trúc điểm (Priority Breakdown)
```bash
curl -X GET http://localhost:3000/api/tasks/<TASK_A_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về đầy đủ thông tin Task A kèm đối tượng `priorityBreakdown` chi tiết điểm thành phần (urgency, importance, deadlinePressure,...).

#### Bước 2.4: Thêm các công việc con (Subtasks) cho Task A
Thêm Subtask 1:
```bash
curl -X POST http://localhost:3000/api/tasks/<TASK_A_ID>/subtasks \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Thiết kế database schema",
    "estimatedMinutes": 30,
    "sortOrder": 0
  }'
```
*(Lưu lại `subtaskId` của Subtask 1)*

Thêm Subtask 2:
```bash
curl -X POST http://localhost:3000/api/tasks/<TASK_A_ID>/subtasks \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Cài đặt NestJS Controller",
    "estimatedMinutes": 90,
    "sortOrder": 1
  }'
```

#### Bước 2.5: Đánh dấu hoàn thành Subtask 1 và kiểm tra chuyển trạng thái tự động
```bash
curl -X PATCH http://localhost:3000/api/subtasks/<SUBTASK_1_ID>/complete \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Subtask 1 đổi thành `isCompleted: true`.
* **Cơ chế ngầm:** Đồng thời, do Task A đang ở trạng thái `TODO` nhưng có ít nhất một công việc con được xử lý, hệ thống sẽ tự động cập nhật trạng thái của Task cha (Task A) sang `IN_PROGRESS`. Bạn có thể xác minh bằng cách gọi lại API xem chi tiết Task A ở bước 2.3.

---

### KỊCH BẢN 3: TỰ ĐỘNG LẬP LỊCH TUẦN THÔNG MINH (SCHEDULER API)

Mục đích: Trải nghiệm thuật toán **Greedy Scheduling** tự động xếp các task vào các slot thời gian trống trong tuần (8h-22h hàng ngày) và khả năng xử lý xung đột lịch.

#### Bước 3.1: Chạy thuật toán tự động lập lịch tuần
```bash
curl -X POST http://localhost:3000/api/schedule/generate \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (201 Created):** Hệ thống tự động quét các Task chưa xong của user (Task A, Task B), chia nhỏ thời lượng cần thực hiện thành các block làm việc (Pomodoro block tương ứng 25 phút hoặc 50 phút dựa trên `focusMode` của task), và xếp tuần tự vào các slot thời gian trống trong tuần này. Trả về danh sách `slots` được tạo ra.

#### Bước 3.2: Lấy lịch tuần hiện tại của User
```bash
curl -X GET http://localhost:3000/api/schedule/weekly \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về danh sách các slot lịch kèm thông tin task liên kết của tuần hiện tại. (Lưu lại một `slotId` để test đổi giờ).

#### Bước 3.3: Cập nhật thời gian của một Slot (Simulate kéo thả trên UI)
Cập nhật slot sang một giờ trống hợp lệ (ví dụ: ngày mai từ 9:00 đến 9:50):
```bash
curl -X PATCH http://localhost:3000/api/schedule/slots/<SLOT_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2026-06-17T09:00:00Z",
    "endAt": "2026-06-17T09:50:00Z"
  }'
```
* **Kết quả kỳ vọng (200 OK):** Slot được cập nhật thành công và được gắn cờ `isManual: true` (để thuật toán lập lịch tự động lần sau không tự ý di dời slot này nữa).

#### Bước 3.4: Thử nghiệm cơ chế phát hiện xung đột lịch (Time Conflict Validation)
Thử dịch chuyển slot đó đè lên khung giờ của một slot lịch đã tồn tại khác:
```bash
curl -X PATCH http://localhost:3000/api/schedule/slots/<SLOT_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "startAt": "2026-06-17T09:15:00Z",
    "endAt": "2026-06-17T10:05:00Z"
  }'
```
* **Kết quả kỳ vọng (400 Bad Request):** Trả về thông báo lỗi: `"Xung đột thời gian với slot khác"`.

#### Bước 3.5: Tái cấu trúc lịch trình (Restructure Schedule)
Khi lịch trình hiện tại bị trễ so với kế hoạch thực tế, người dùng yêu cầu tái lập lịch từ thời điểm hiện tại:
```bash
curl -X POST http://localhost:3000/api/schedule/restructure \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (201 Created):**
  1. Các slot tự động (`isManual: false`) trước thời điểm hiện tại được giữ nguyên. Các slot tự động từ thời điểm hiện tại trở đi bị xóa và sắp xếp lại vào các khoảng trống còn lại.
  2. Các Task bị ảnh hưởng (bị dời lịch) sẽ được tự động cộng dồn số lần trì hoãn (`rescheduleCount` tăng thêm 1), đây là biến số quan trọng để đánh giá chỉ số trì hoãn (Procrastination) sau này.

---

### KỊCH BẢN 4: THỰC THI PHIÊN TẬP TRUNG (POMODORO SESSIONS API)

Mục đích: Trải nghiệm máy trạng thái (State Machine) quản lý phiên tập trung: Khởi chạy -> Tạm dừng -> Tiếp tục -> Hoàn thành / Hủy bỏ, và khảo sát lý do bỏ dở.

#### Bước 4.1: Bắt đầu một phiên Pomodoro cho Task A
```bash
curl -X POST http://localhost:3000/api/pomodoro/sessions \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<TASK_A_ID>",
    "sessionType": "WORK"
  }'
```
* **Kết quả kỳ vọng (201 Created):** Khởi tạo thành công phiên Pomodoro ở trạng thái `IN_PROGRESS`. 
* **Lưu ý:** Vì Task A có `focusMode` là `DEEP_FOCUS`, hệ thống tự thiết lập `plannedDuration` là `50` phút thay vì `25` phút thông thường.
* *(Lưu lại `sessionId` vừa tạo)*

#### Bước 4.2: Thử bắt đầu một phiên khác khi phiên cũ chưa kết thúc
```bash
curl -X POST http://localhost:3000/api/pomodoro/sessions \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<TASK_A_ID>",
    "sessionType": "WORK"
  }'
```
* **Kết quả kỳ vọng (400 Bad Request):** Báo lỗi không cho phép chạy song song nhiều phiên Pomodoro: `"Đang có phiên Pomodoro đang chạy. Hãy hoàn thành hoặc hủy trước."`

#### Bước 4.3: Kiểm tra phiên Pomodoro hiện tại đang hoạt động
```bash
curl -X GET http://localhost:3000/api/pomodoro/sessions/current \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về chi tiết phiên Pomodoro đang diễn ra.

#### Bước 4.4: Tạm dừng phiên (Pause Session)
```bash
curl -X PATCH http://localhost:3000/api/pomodoro/sessions/<SESSION_ID>/pause \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trạng thái phiên chuyển thành `PAUSED`, biến `pauseCount` tự động tăng lên 1.

#### Bước 4.5: Tiếp tục phiên sau khi tạm dừng (Resume Session)
```bash
curl -X PATCH http://localhost:3000/api/pomodoro/sessions/<SESSION_ID>/resume \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trạng thái phiên quay lại `IN_PROGRESS`.

#### Bước 4.6: Hoàn thành phiên Pomodoro (Complete Session)
```bash
curl -X PATCH http://localhost:3000/api/pomodoro/sessions/<SESSION_ID>/complete \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trạng thái đổi thành `COMPLETED`, ghi nhận thời gian kết thúc `endedAt` và tự động tính toán thời lượng thực tế tập trung `actualDuration` (phút).

#### Bước 4.7: Tạo phiên mới và thực hiện hủy ngang (Cancel / Drop Session)
Bắt đầu phiên tiếp theo:
```bash
curl -X POST http://localhost:3000/api/pomodoro/sessions \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<TASK_A_ID>",
    "sessionType": "WORK"
  }'
```
*(Lưu lại `newSessionId`)*

Thực hiện hủy ngang phiên:
```bash
curl -X PATCH http://localhost:3000/api/pomodoro/sessions/<NEW_SESSION_ID>/cancel \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Phiên chuyển sang trạng thái `CANCELLED`.

#### Bước 4.8: Gửi phản hồi lý do hủy ngang phiên (Quick Feedback)
```bash
curl -X POST http://localhost:3000/api/pomodoro/sessions/<NEW_SESSION_ID>/quick-feedback \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Bị cắt ngang bởi cuộc họp đột xuất"
  }'
```
* **Kết quả kỳ vọng (201 Created):** Ghi nhận thành công lý do hủy phiên vào cột `dropReason` để phân tích hành vi trì hoãn sau này.

#### Bước 4.9: Kiểm tra lịch sử phiên Pomodoro của User
```bash
curl -X GET http://localhost:3000/api/pomodoro/sessions \
  -H "Authorization: Bearer <ACCESS_TOKEN_CỦA_USER>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về danh sách các phiên Pomodoro gần nhất của user, hiển thị đầy đủ các trạng thái `COMPLETED` và `CANCELLED`.

---

### KỊCH BẢN 5: QUẢN TRỊ & CẤU HÌNH HỆ THỐNG (ADMIN API)

Mục đích: Sử dụng quyền quản trị viên (`ADMIN`) để giám sát người dùng, khóa tài khoản, xem dashboard và cập nhật các trọng số hệ thống kèm theo validation.

*Chú ý: Đảm bảo sử dụng `accessToken` của tài khoản `admin@focusflow.com` (tài khoản đã được nâng cấp quyền ADMIN ở mục I.3).*

#### Bước 5.1: Đăng nhập tài khoản Admin để lấy token Admin
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@focusflow.com",
    "password": "adminpassword"
  }'
```
*(Lưu lại `ADMIN_ACCESS_TOKEN`)*

#### Bước 5.2: Lấy danh sách toàn bộ người dùng trong hệ thống
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về danh sách tất cả các tài khoản bao gồm cả User và Admin. (Lưu lại `userId` của Demo User để test ở bước tiếp theo).

#### Bước 5.3: Xem thông tin chi tiết một User dưới góc nhìn Admin
```bash
curl -X GET http://localhost:3000/api/admin/users/<USER_ID> \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về chi tiết tài khoản của User đó kèm theo thống kê số lượng task và số lượng phiên Pomodoro đã thực hiện.

#### Bước 5.4: Khóa tài khoản của User và kiểm tra chặn quyền truy cập
Tiến hành khóa tài khoản Demo User:
```bash
curl -X PATCH http://localhost:3000/api/admin/users/<USER_ID>/toggle-active \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về thông tin user với trạng thái cập nhật `"isActive": false`.

Thử nghiệm đăng nhập lại bằng tài khoản User vừa bị khóa ở bước 1.3:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo.user@focusflow.com",
    "password": "password123"
  }'
```
* **Kết quả kỳ vọng (403 Forbidden):** Đăng nhập thất bại kèm thông báo lỗi: `"Tài khoản đã bị vô hiệu hóa"`.

*Mở khóa lại tài khoản User để tiếp tục sử dụng:*
```bash
curl -X PATCH http://localhost:3000/api/admin/users/<USER_ID>/toggle-active \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

#### Bước 5.5: Xem danh sách cấu hình và trọng số hệ thống hiện tại
```bash
curl -X GET http://localhost:3000/api/admin/configs \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về danh sách tất cả cấu hình hệ thống (trọng số w1-w5 cho điểm ưu tiên, u1-u5 cho điểm trì hoãn và các thông số Pomodoro).

#### Bước 5.6: Cập nhật trọng số hệ thống mới
Thay đổi các trọng số của thuật toán tính điểm ưu tiên (Priority Score):
```bash
curl -X PATCH http://localhost:3000/api/admin/configs \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "configs": [
      { "key": "priority_weight_urgency", "value": "0.30" },
      { "key": "priority_weight_importance", "value": "0.20" },
      { "key": "priority_weight_deadline_pressure", "value": "0.20" },
      { "key": "priority_weight_energy_fit", "value": "0.15" },
      { "key": "priority_weight_procrastination_risk", "value": "0.15" }
    ]
  }'
```
* **Kết quả kỳ vọng (200 OK):** Cập nhật thành công các trọng số mới vào database.
* **Cơ chế kiểm soát:** Vì tổng giá trị của 5 trọng số trên bằng `0.30 + 0.20 + 0.20 + 0.15 + 0.15 = 1.0` (đạt yêu cầu chuẩn hóa).

#### Bước 5.7: Kiểm chứng Validation ràng buộc tổng trọng số của Admin
Thử cập nhật các trọng số có tổng không bằng 1.0 (ví dụ: tổng bằng 0.9):
```bash
curl -X PATCH http://localhost:3000/api/admin/configs \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "configs": [
      { "key": "priority_weight_urgency", "value": "0.20" },
      { "key": "priority_weight_importance", "value": "0.20" },
      { "key": "priority_weight_deadline_pressure", "value": "0.20" },
      { "key": "priority_weight_energy_fit", "value": "0.15" },
      { "key": "priority_weight_procrastination_risk", "value": "0.15" }
    ]
  }'
```
* **Kết quả kỳ vọng (400 Bad Request):** Hệ thống từ chối cập nhật và trả về thông báo lỗi: `"Tổng trọng số Priority Score phải bằng 1 (hiện tại: 0.9000)"`.

#### Bước 5.8: Lấy thông tin Dashboard thống kê tổng quan hệ thống
```bash
curl -X GET http://localhost:3000/api/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```
* **Kết quả kỳ vọng (200 OK):** Trả về báo cáo thống kê tổng quan (số lượng user hoạt động, số task mới tạo trong ngày,...).

---

## III. Dọn dẹp dữ liệu thử nghiệm (Tùy chọn)
Nếu bạn muốn đặt lại toàn bộ cơ sở dữ liệu về trạng thái ban đầu sạch sẽ để demo từ đầu:
```bash
npx prisma migrate reset --force
```
*(Lưu ý: Lệnh này sẽ xóa sạch dữ liệu cũ, chạy lại tất cả các migration và tự động kích hoạt seed configs mới).*
