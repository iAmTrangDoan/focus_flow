# FocusFlow

> **Hệ thống quản lý công việc cá nhân tích hợp AI và Pomodoro**

FocusFlow là ứng dụng giúp người dùng quản lý công việc hiệu quả hơn thông qua việc tự động **tính điểm ưu tiên (Priority Score)**, **lập lịch tuần thông minh (Greedy Scheduling)**, **theo dõi phiên tập trung (Pomodoro)** và **phân tích hành vi trì hoãn (Procrastination Score)** có sự hỗ trợ của Google Gemini AI.

---

## Công nghệ sử dụng

### Backend
| Công nghệ | Mục đích |
|---|---|
| **NestJS** (TypeScript) | Framework backend, kiến trúc Modular Monolith |
| **PostgreSQL** (Neon Cloud) | Cơ sở dữ liệu quan hệ lưu trữ toàn bộ dữ liệu hệ thống |
| **Prisma ORM** | ORM mapping và migration quản lý schema database |
| **JWT (Access + Refresh Token)** | Xác thực người dùng, cơ chế Token Rotation bảo mật |
| **Socket.IO** | WebSocket server – đồng hồ Pomodoro realtime, thông báo realtime |
| **Google Gemini AI API** | Gợi ý chia nhỏ công việc (subtask) và sinh nhận xét năng suất hàng tuần |
| **Swagger / OpenAPI** | Tài liệu API tự động tại `/api/docs` |
| **Docker** | Container hóa backend và frontend để triển khai |

### Frontend
| Công nghệ | Mục đích |
|---|---|
| **React 19** + **TypeScript** | Framework UI |
| **Vite** | Build tool và dev server |
| **TailwindCSS v4** | Styling utility-first |
| **Axios** | HTTP client giao tiếp với Backend API |
| **Socket.io-client** | WebSocket client nhận tick Pomodoro và thông báo realtime |


---

## Tổng quan hệ thống

FocusFlow được xây dựng theo kiến trúc **Modular Monolith** gồm 7 module nghiệp vụ chính:

```
Auth → Tasks → Scheduler → Pomodoro → Analytics → AI → Admin
```

| Module | Chức năng chính |
|---|---|
| **Auth** | Đăng ký, đăng nhập, phân quyền USER/ADMIN |
| **Tasks** | CRUD công việc + subtask, tự động tính Priority Score theo 5 thành phần |
| **Scheduler** | Thuật toán Greedy Scheduling lập lịch tuần, quản lý Schedule Slot, phát hiện xung đột giờ |
| **Pomodoro** | State machine quản lý phiên tập trung: Start → Pause → Resume → Complete/Cancel, khảo sát lý do bỏ ngang |
| **Analytics** | Ghi nhận behavior log, tính Procrastination Score hàng ngày (5 chỉ số), thống kê hiệu suất |
| **AI (Gemini)** | Gợi ý subtask từ tên task, sinh AI Insights hàng tuần |
| **Admin** | Quản lý người dùng, khóa tài khoản, dashboard tổng quan, cấu hình trọng số hệ thống |

### Thuật toán nổi bật

**Priority Score** – tự động tính điểm ưu tiên cho mỗi task:
```
PS = w1×Urgency + w2×Importance + w3×DeadlinePressure + w4×EnergyFit + w5×ProcrastinationRisk
```
Trọng số mặc định: `w1=0.25, w2=0.25, w3=0.20, w4=0.15, w5=0.15` (Admin có thể cấu hình).

**Procrastination Score** – đo mức độ trì hoãn của người dùng (0–100):
```
Score = u1×DelayRate + u2×DeadlineMissRate + u3×TaskIdleDays + u4×RescheduleFrequency + u5×DurationAccuracy
```
Phân loại: **Tốt** (0–30) · **Trung bình** (31–60) · **Cần can thiệp** (61–100).

---

## Cấu trúc thư mục

```
FocusFlow/
├── backend/                    # NestJS backend
│   ├── prisma/
│   │   ├── schema.prisma       # Định nghĩa database schema
│   │   ├── seed.ts             # Dữ liệu khởi tạo (system configs)
│   │   └── migrations/         # Lịch sử migration
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Xác thực & phân quyền
│   │   │   ├── tasks/          # Quản lý task & subtask
│   │   │   ├── scheduler/      # Lập lịch tuần tự động
│   │   │   ├── pomodoro/       # Theo dõi phiên tập trung
│   │   │   └── admin/          # Quản trị hệ thống
│   │   ├── common/             # Decorators, Guards dùng chung
│   │   └── prisma/             # Prisma service
│   ├── .env.example            # Mẫu biến môi trường
│   └── Dockerfile
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Các component UI
│   │   ├── pages/              # Các trang
│   │   ├── stores/             # Zustand stores
│   │   ├── hooks/              # Custom hooks (React Query)
│   │   └── services/           # Axios API service
│   ├── .env.example
│   └── Dockerfile
├── document/                   # Tài liệu thiết kế hệ thống
├── docker-compose.yml          # Production deployment
├── docker-compose.dev.yml      # Development với hot-reload
└── README.md
```

---

## Yêu cầu môi trường

| Công cụ | Phiên bản tối thiểu | Link tải |
|---|---|---|
| **Node.js** | v20 LTS trở lên | https://nodejs.org |
| **npm** | v10 trở lên | Đi kèm Node.js |
| **Git** | Bất kỳ | https://git-scm.com |
| **Docker** *(tùy chọn)* | v24 trở lên | https://www.docker.com |

- Một **PostgreSQL database** – khuyến nghị dùng [Neon.tech](https://neon.tech) (free tier, serverless PostgreSQL)
- Một **Google Gemini API Key** – đăng ký tại [Google AI Studio](https://aistudio.google.com)

---

## Hướng dẫn cài đặt và chạy Local

### Phương án 1: Chạy thủ công (Không dùng Docker)

#### Bước 1: Clone repository

```bash
git clone <repository-url>
cd FocusFlow
```

#### Bước 2: Cài đặt Backend

```bash
cd backend
npm install
```

Tạo file cấu hình môi trường từ mẫu:

```bash
cp .env.example .env
```

Mở file `.env` và điền đầy đủ các giá trị:

```env
# Chuỗi kết nối PostgreSQL (Neon hoặc database local)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Bí mật JWT – có thể tạo ngẫu nhiên bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="your-jwt-secret-at-least-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-at-least-32-chars"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Google Gemini API Key
GEMINI_API_KEY="your-gemini-api-key"

# Port backend chạy
PORT=3000

# URL của frontend (dùng cho CORS)
FRONTEND_URL="http://localhost:5173"
```

Chạy migration database và seed dữ liệu cấu hình mặc định:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Khởi động backend ở chế độ development (hot-reload):

```bash
npm run start:dev
```

- Backend sẽ chạy tại: `http://localhost:3000`  
- Swagger API Docs: `http://localhost:3000/api/docs`

---

#### Bước 3: Cài đặt Frontend

Mở terminal mới, từ thư mục gốc `FocusFlow/`:

```bash
cd frontend
npm install
```

Tạo file cấu hình môi trường:

```bash
cp .env.example .env
```

Mở file `.env` frontend và điền:

```env
VITE_API_URL="http://localhost:3000/api"
```

Khởi động frontend:

```bash
npm run dev
```

- Frontend sẽ chạy tại: `http://localhost:5173`

---

#### Bước 4: Tạo tài khoản Admin (Lần đầu)

Vì API đăng ký mặc định tạo tài khoản với role `USER`, để có tài khoản Admin bạn cần:

1. Đăng ký một tài khoản bình thường qua API hoặc giao diện web.
2. Mở Prisma Studio để chỉnh trực tiếp trong database:
   ```bash
   cd backend
   npx prisma studio
   ```
3. Truy cập bảng **users** → tìm email admin → đổi cột `role` từ `USER` thành `ADMIN` → **Save 1 change**.

---

### Phương án 2: Chạy bằng Docker (Development với hot-reload)

```bash
# Từ thư mục gốc FocusFlow/
# Đảm bảo backend/.env đã được điền đầy đủ

docker-compose -f docker-compose.dev.yml up --build
```

- Backend (hot-reload): `http://localhost:3000`
- Frontend (hot-reload): `http://localhost:5173`

---

### Phương án 3: Chạy bằng Docker (Production)

```bash
docker-compose up --build -d
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:80`

---

## Các lệnh hữu ích

### Backend

```bash
# Chạy development (hot-reload)
npm run start:dev

# Build production
npm run build

# Chạy production build
npm run start:prod

# Chạy unit tests
npm run test

# Chạy tests với coverage
npm run test:cov

# Xem database trong giao diện UI
npx prisma studio

# Tạo migration mới sau khi sửa schema
npx prisma migrate dev --name <tên_thay_đổi>

# Đặt lại database (xóa sạch và chạy lại toàn bộ migration + seed)
npx prisma migrate reset --force
```

### Frontend

```bash
# Chạy development
npm run dev

# Build production
npm run build

# Preview bản build production
npm run preview

# Kiểm tra lỗi ESLint
npm run lint
```

---

## Danh sách API

Toàn bộ API có thể xem tương tác đầy đủ tại Swagger: **`http://localhost:3000/api/docs`**

> **Lưu ý chung:**
> - Tất cả endpoint (trừ `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh`) yêu cầu header: `Authorization: Bearer <access_token>`
> - Route `/api/admin/*` yêu cầu role = `ADMIN`
> - Lỗi trả về theo format thống nhất: `{ statusCode, message, error }`

### Auth

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/api/auth/login` | Đăng nhập, nhận access token + refresh token |
| `POST` | `/api/auth/refresh` | Cấp lại access token từ refresh token |
| `POST` | `/api/auth/logout` | Đăng xuất, thu hồi refresh token |
| `GET` | `/api/auth/me` | Lấy thông tin người dùng hiện tại |

### Tasks & Subtasks

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/tasks` | Lấy danh sách task (sắp xếp theo priority score) |
| `POST` | `/api/tasks` | Tạo task mới |
| `GET` | `/api/tasks/:id` | Xem chi tiết task + priority breakdown |
| `PATCH` | `/api/tasks/:id` | Cập nhật task |
| `DELETE` | `/api/tasks/:id` | Xóa task |
| `PATCH` | `/api/tasks/:id/complete` | Đánh dấu hoàn thành task |
| `GET` | `/api/tasks/:id/subtasks` | Lấy danh sách subtask của task |
| `POST` | `/api/tasks/:id/subtasks` | Thêm subtask mới |
| `PATCH` | `/api/subtasks/:id` | Cập nhật subtask |
| `PATCH` | `/api/subtasks/:id/complete` | Đánh dấu hoàn thành subtask |
| `DELETE` | `/api/subtasks/:id` | Xóa subtask |

### Scheduler

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/schedule/generate` | Chạy thuật toán Greedy Scheduling tạo lịch tuần |
| `GET` | `/api/schedule/weekly` | Lấy lịch tuần hiện tại |
| `GET` | `/api/schedule/slots` | Lấy danh sách slots (lọc theo khoảng ngày) |
| `PATCH` | `/api/schedule/slots/:id` | Cập nhật slot (kéo thả đổi giờ) |
| `DELETE` | `/api/schedule/slots/:id` | Xóa slot khỏi lịch |
| `POST` | `/api/schedule/restructure` | Tái cấu trúc lịch từ thời điểm hiện tại |

### Pomodoro

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/pomodoro/sessions` | Bắt đầu phiên Pomodoro mới |
| `GET` | `/api/pomodoro/sessions/current` | Lấy phiên đang hoạt động |
| `GET` | `/api/pomodoro/sessions` | Lịch sử các phiên Pomodoro |
| `PATCH` | `/api/pomodoro/sessions/:id/pause` | Tạm dừng phiên |
| `PATCH` | `/api/pomodoro/sessions/:id/resume` | Tiếp tục phiên |
| `PATCH` | `/api/pomodoro/sessions/:id/complete` | Hoàn thành phiên |
| `PATCH` | `/api/pomodoro/sessions/:id/cancel` | Hủy / bỏ ngang phiên |
| `POST` | `/api/pomodoro/sessions/:id/quick-feedback` | Gửi lý do hủy ngang |

### Admin

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/users` | Danh sách toàn bộ user |
| `GET` | `/api/admin/users/:id` | Xem chi tiết user |
| `PATCH` | `/api/admin/users/:id/toggle-active` | Khóa / mở khóa tài khoản |
| `GET` | `/api/admin/dashboard` | Chỉ số tổng quan hệ thống |
| `GET` | `/api/admin/configs` | Lấy cấu hình hệ thống |
| `PATCH` | `/api/admin/configs` | Cập nhật cấu hình (validate trọng số) |

---

## Biến môi trường Backend

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | ✅ | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | ✅ | Bí mật ký Access Token (tối thiểu 32 ký tự) |
| `JWT_REFRESH_SECRET` | ✅ | Bí mật ký Refresh Token (tối thiểu 32 ký tự) |
| `JWT_EXPIRES_IN` | ✅ | Thời hạn Access Token (vd: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | Thời hạn Refresh Token (vd: `7d`) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API Key |
| `PORT` | ❌ | Port backend (mặc định: `3000`) |
| `FRONTEND_URL` | ❌ | URL frontend cho CORS (mặc định: `http://localhost:5173`) |

---

## Ghi chú

- **Database**: Dự án sử dụng **Neon Serverless PostgreSQL** (cloud), không cần cài PostgreSQL local. Bạn có thể tạo database miễn phí tại [neon.tech](https://neon.tech).
- **Gemini AI**: Nếu không có API key, các tính năng gợi ý subtask và AI Insights sẽ không hoạt động, nhưng các chức năng còn lại vẫn hoạt động bình thường.
- **Tài liệu chi tiết**: Xem thêm trong thư mục `/document/` để biết thiết kế hệ thống, các công thức tính điểm và kịch bản demo API.

---

## Tài liệu tham khảo

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon Serverless PostgreSQL](https://neon.tech/docs)
- [Google Gemini AI API](https://ai.google.dev/docs)
- [React Documentation](https://react.dev)
- [TanStack Query](https://tanstack.com/query)
