# Hướng Dẫn Cài Đặt Hệ Thống FocusFlow

Tài liệu này hướng dẫn chi tiết các bước cài đặt, cấu hình môi trường và vận hành hệ thống FocusFlow (bao gồm cả Backend NestJS và Frontend React Vite) trên môi trường máy tính cá nhân (Local) và Docker.

---

## 📋 Yêu Cầu Hệ Thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

| Công cụ | Phiên bản tối thiểu | Mục đích | Link tải |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v22 LTS` trở lên | Runtime thực thi JavaScript/TypeScript | [Tải Node.js](https://nodejs.org) |
| **npm** | `v10` trở lên | Quản lý gói thư viện (Đi kèm với Node.js) | — |
| **Git** | Bất kỳ | Quản lý mã nguồn | [Tải Git](https://git-scm.com) |
| **Docker & Compose** | `v24` / `v2.20` | Đóng gói và chạy container hệ thống | [Tải Docker Desktop](https://www.docker.com) |

> [!IMPORTANT]
> **Dịch vụ Cloud cần chuẩn bị trước:**
> 1. **PostgreSQL Database**: Dự án được cấu hình mặc định để sử dụng **Neon Serverless PostgreSQL** (Cloud) để không cần cài đặt Postgres cục bộ. Bạn cần đăng ký tài khoản miễn phí tại [Neon.tech](https://neon.tech) và tạo một database mới để lấy chuỗi kết nối (`DATABASE_URL`).
> 2. **Google Gemini API Key**: Dùng cho tính năng gợi ý subtask và nhận xét năng suất tuần bằng AI. Hãy đăng ký lấy API key tại [Google AI Studio](https://aistudio.google.com).

---

## 🛠️ Bước 1: Clone Source Code

Mở terminal trên máy tính và chạy lệnh sau để tải mã nguồn về máy:

```bash
git clone <repository-url>
cd FocusFlow
```

---

## 🚀 Phương Án 1: Chạy Thủ Công (Không Dùng Docker)

### 1. Cấu hình & Chạy Backend (NestJS)

Di chuyển vào thư mục backend và cài đặt thư viện:

```bash
cd backend
npm install
```

Tạo file cấu hình môi trường `.env` từ file mẫu:

```bash
cp .env.example .env
```

Mở file `.env` vừa tạo và cập nhật các thông số quan trọng:

```env
# URL kết nối database lấy từ Neon.tech
DATABASE_URL="postgresql://neondb_owner:PASSWORD@EP_HOST/neondb?sslmode=require"

# Khóa bí mật mã hóa JWT (Tạo chuỗi ngẫu nhiên dài tối thiểu 32 ký tự)
JWT_SECRET="tạo_chuỗi_bí_mật_của_bạn_ở_đây"
JWT_REFRESH_SECRET="tạo_chuỗi_bí_mật_refresh_token_ở_đây"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Google Gemini API Key
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-3.1-flash-lite"

# Cấu hình cổng chạy backend
PORT=3000
FRONTEND_URL="http://localhost:5173"
```

Chạy migration để đồng bộ cấu trúc bảng và khởi tạo dữ liệu mặc định (seed):

```bash
npx prisma migrate deploy
npx prisma db seed
```

Khởi chạy server backend ở chế độ lập trình (Hot-Reload):

```bash
npm run start:dev
```

* **Backend URL**: [http://localhost:3000](http://localhost:3000)
* **Tài liệu API (Swagger)**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

---

### 2. Cấu hình & Chạy Frontend (React + Vite)

Mở một cửa sổ terminal mới, di chuyển đến thư mục gốc của dự án `FocusFlow/`:

```bash
cd frontend
npm install
```

Tạo file môi trường `.env`:

```bash
cp .env.example .env
```

Kiểm tra nội dung file `.env` để đảm bảo kết nối đúng URL của API backend:

```env
VITE_API_URL="http://localhost:3000/api"
```

Khởi chạy server frontend:

```bash
npm run dev
```

* **Frontend URL**: [http://localhost:5173](http://localhost:5173)

---

## 🐳 Phương Án 2: Chạy Bằng Docker (Khuyên Dùng)

Phương án này giúp bạn khởi chạy nhanh chóng toàn bộ ứng dụng mà không cần cài đặt Node.js hay chạy các câu lệnh cài thư viện thủ công.

> [!NOTE]
> Hãy chắc chắn bạn đã điền đầy đủ các thông số cấu hình trong file `backend/.env` trước khi khởi động Docker Compose.

### Chạy chế độ Development (Có Hot-Reload)

Chế độ này tự động đồng bộ mã nguồn local của bạn vào container, cho phép code thay đổi sẽ reload ngay lập tức.

```bash
# Đứng tại thư mục gốc FocusFlow/
docker compose -f docker-compose.dev.yml up --build
```

* **Backend**: [http://localhost:3000](http://localhost:3000)
* **Frontend**: [http://localhost:5173](http://localhost:5173)

### Chạy chế độ Production

Chế độ này đóng gói tối ưu hóa mã nguồn, khởi chạy frontend thông qua Web Server Nginx trên cổng 80.

```bash
# Đứng tại thư mục gốc FocusFlow/
docker compose up --build -d
```

* **Backend**: [http://localhost:3000](http://localhost:3000)
* **Frontend**: [http://localhost:80](http://localhost:80)

---

## 🔑 Bước 3: Đăng Ký Tài Khoản Admin Ban Đầu

Do tính năng đăng ký trên giao diện mặc định tạo tài khoản với vai trò `USER`, để truy cập được trang quản trị (`ADMIN`), bạn thực hiện các bước sau:

1. Truy cập giao diện ứng dụng tại [http://localhost:5173](http://localhost:5173) và thực hiện đăng ký một tài khoản mới.
2. Mở trình quản lý dữ liệu **Prisma Studio**:
   ```bash
   cd backend
   npx prisma studio
   ```
3. Trên giao diện web Prisma Studio, truy cập bảng **User**.
4. Tìm đến dòng tài khoản bạn vừa đăng ký, thay đổi giá trị trường `role` từ `USER` thành `ADMIN`.
5. Bấm nút **Save change** ở góc trên để lưu lại. Giờ đây bạn có thể đăng nhập và truy cập giao diện admin.

---

## 🛠️ Các Lệnh Thường Dùng

### Backend
* `npm run build`: Biên dịch mã nguồn TypeScript thành JS chạy production.
* `npm run test`: Chạy toàn bộ các test cases.
* `npx prisma studio`: Mở giao diện UI quản lý database trực tiếp.
* `npx prisma migrate dev --name <tên>`: Tạo và áp dụng bản migration mới khi thay đổi schema.

### Frontend
* `npm run build`: Tối ưu hóa code và build production.
* `npm run lint`: Kiểm tra và phân tích lỗi cú pháp.
