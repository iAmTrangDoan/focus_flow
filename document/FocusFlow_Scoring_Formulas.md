# FocusFlow – Công thức tính Priority Score & Procrastination Score

Tài liệu này mô tả chi tiết công thức tính hai chỉ số thuật toán cốt lõi của FocusFlow: **Priority Score** (điểm ưu tiên công việc) và **Procrastination Score** (điểm trì hoãn người dùng). Các trọng số trong công thức đều được cấu hình trong bảng `system_configs`, cho phép Admin tinh chỉnh.

---

## 1. Priority Score

### 1.1. Tổng quan

Priority Score là điểm số (thang 0–100) dùng để xếp hạng công việc trên Task Board và làm đầu vào cho thuật toán Greedy Scheduling. Điểm số được tính tại thời điểm tạo/cập nhật task, và được tính lại định kỳ (vì `Urgency`, `DeadlinePressure` phụ thuộc thời gian hiện tại).

### 1.2. Công thức tổng

```
PriorityScore = w1 * Urgency
              + w2 * Importance
              + w3 * DeadlinePressure
              + w4 * EnergyFit
              + w5 * ProcrastinationRisk
```

Trong đó:
- Mỗi thành phần được chuẩn hóa về thang **[0, 10]** trước khi nhân trọng số.
- `w1 + w2 + w3 + w4 + w5 = 1` (tổng trọng số bằng 1, để PriorityScore cũng nằm trong [0, 10]).
- Giá trị mặc định đề xuất: `w1 = 0.25`, `w2 = 0.25`, `w3 = 0.2`, `w4 = 0.15`, `w5 = 0.15`.

### 1.3. Chi tiết từng thành phần

#### (1) Urgency – Mức khẩn cấp theo deadline

Dealine còn bao lâu?

```
days_left = (deadline - now) / 1 ngày

Urgency = 10,                                 nếu days_left <= 0  (đã quá hạn)
Urgency = 10 - (days_left / D_max) * 10,     nếu 0 < days_left <= D_max
Urgency = 0,                                   nếu days_left > D_max
```

- `D_max`: ngưỡng số ngày coi như "không còn khẩn cấp" (mặc định = 14 ngày, cấu hình được).
- Task không có deadline → `Urgency = 0` (hoặc một giá trị mặc định thấp, ví dụ 10, để vẫn có thể xuất hiện trên board nhưng không ưu tiên theo thời gian).

#### (2) Importance – Tầm quan trọng từ ma trận Eisenhower

Suy ra từ `importance` và `deadline`
| Importance | Urgency | Eisenhower | Score | Ý nghĩa
| High | Gần (≤48h) | Q1 | 10 | Làm ngay, ưu tiên tối cao
| High | Xa (>48h) | Q2 | 7 | Quan trọng, lên kế hoạch trước
| Low | Gần (≤48h) | Q3 | 4 | Delegate hoặc làm nhanh
| Low | Xa (>48h) | Q4 | 1 | Loại bỏ hoặc để sau


#### (3) DeadlinePressure – Áp lực thời gian còn lại

Đo lường mức độ "gấp" giữa thời lượng còn cần làm so với thời gian còn lại đến deadline.

```
remaining_work = estimated_duration - (tổng thời lượng đã thực hiện qua các pomodoro_sessions)
time_left = deadline - now   (đơn vị: phút)

ratio = remaining_work / time_left   (nếu time_left > 0)

DeadlinePressure = 10,                        nếu time_left <= 0 (quá hạn nhưng còn việc)
DeadlinePressure = min(10, ratio * 10),      nếu time_left > 0
DeadlinePressure = 0,                          nếu remaining_work <= 0 (đã xong việc)
```

- `ratio >= 1` nghĩa là thời lượng còn lại không đủ để hoàn thành đúng hạn → `DeadlinePressure = 10`.
- Task không có deadline → `DeadlinePressure = 0`.

#### (4) EnergyFit – Độ phù hợp năng lượng theo khung giờ

Dựa trên `behavior_profiles.best_focus_hours` (các khung giờ người dùng làm việc hiệu quả nhất, được tính từ tỷ lệ hoàn thành Pomodoro theo giờ).

```
EnergyFit = 10,  nếu task có schedule_slot hiện tại nằm trong best_focus_hours
EnergyFit = 5,   nếu task chưa được xếp lịch (chưa xác định được khung giờ)
EnergyFit = 2,   nếu task có schedule_slot nằm trong các khung giờ năng suất thấp
```

- Đối với người dùng mới chưa có `behavior_profiles` (chưa đủ dữ liệu) → `EnergyFit = 5` (giá trị trung lập).
- Thành phần này chủ yếu phát huy tác dụng *sau khi* task đã được Scheduler xếp lịch lần đầu, dùng để tinh chỉnh ưu tiên ở các lần tính lại tiếp theo.

#### (5) ProcrastinationRisk – Rủi ro trì hoãn dựa trên lịch sử cá nhân

Dựa trên `procrastination_scores.total_score` gần nhất của người dùng (điểm trì hoãn tổng thể, thang 0–100) và đặc điểm riêng của loại task (nhóm/category).

```
base_risk = procrastination_scores.total_score (điểm trì hoãn chung gần nhất, 0-100)

category_modifier =
    +1  nếu task thuộc nhóm/category có Delay Rate lịch sử cao hơn trung bình
     0   nếu không có dữ liệu phân loại theo nhóm
    -1  nếu task thuộc nhóm có Delay Rate lịch sử thấp hơn trung bình

ProcrastinationRisk = clamp(base_risk + category_modifier, 0, 10)
```

- `clamp(x, 0, 10)`: giới hạn giá trị trong khoảng [0, 10].
- Người dùng mới chưa có `procrastination_scores` → `ProcrastinationRisk = 5` (giá trị trung lập, mặc định).

### 1.4. Ý nghĩa kết quả

- `PriorityScore` càng cao → task càng được xếp lên đầu Task Board và được Scheduler ưu tiên xếp lịch trước.
- `PriorityScore` được tính lại:
  - Mỗi khi task được tạo/cập nhật (deadline, quadrant, estimated_duration thay đổi).
  - Định kỳ (job hàng ngày, cùng lúc với job tính Procrastination Score), do `Urgency`, `DeadlinePressure`, `EnergyFit`, `ProcrastinationRisk` đều phụ thuộc thời gian/dữ liệu hành vi mới.

---

## 2. Procrastination Score

### 2.1. Tổng quan

Procrastination Score là điểm số (thang 0–100) phản ánh mức độ trì hoãn của người dùng, được tính **tự động lúc 00:00 mỗi ngày** dựa trên dữ liệu của một khoảng thời gian quan sát (mặc định: 14 hoặc 30 ngày gần nhất, cấu hình được qua `system_configs`).

### 2.2. Công thức tổng

```
ProcrastinationScore = u1 * DelayRate
                     + u2 * DeadlineMissRate
                     + u3 * TaskIdleDaysNorm
                     + u4 * RescheduleFrequencyNorm
                     + u5 * TimeDurationAccuracyNorm
```

Trong đó:
- Mỗi thành phần được chuẩn hóa về thang **[0, 100]**.
- `u1 + u2 + u3 + u4 + u5 = 1`.
- Giá trị mặc định đề xuất: `u1 = 0.25`, `u2 = 0.25`, `u3 = 0.2`, `u4 = 0.15`, `u5 = 0.15`.

### 2.3. Chi tiết từng thành phần

Giả sử khoảng quan sát gồm `N` task có `schedule_slots` hoặc đã hoàn thành trong kỳ.

#### (1) DelayRate – Tỷ lệ task bắt đầu trễ so với lịch

```
late_started_tasks = số task có pomodoro_sessions.started_at > schedule_slots.start_time
                      (lệch quá ngưỡng cho phép, ví dụ > 10 phút)

scheduled_tasks = tổng số task đã được xếp lịch (có schedule_slots) trong kỳ

DelayRate = (late_started_tasks / scheduled_tasks) * 100
```

- Nếu `scheduled_tasks = 0` (chưa có lịch nào trong kỳ) → `DelayRate = 0`.

#### (2) DeadlineMissRate – Tỷ lệ task không hoàn thành đúng deadline

```
missed_tasks = số task có deadline trong kỳ mà:
               (status != 'completed') OR (completed_at > deadline)

tasks_with_deadline = tổng số task có deadline trong kỳ

DeadlineMissRate = (missed_tasks / tasks_with_deadline) * 100
```

- Nếu `tasks_with_deadline = 0` → `DeadlineMissRate = 0`.

#### (3) TaskIdleDays → TaskIdleDaysNorm – Số ngày trung bình task tồn tại mà chưa được bắt đầu

```
idle_days(task) = (first_pomodoro_started_at hoặc now nếu chưa bắt đầu) - task.created_at  (đơn vị: ngày)

avg_idle_days = average(idle_days(task)) với mọi task tạo trong kỳ

TaskIdleDaysNorm = min(100, (avg_idle_days / IDLE_MAX) * 100)
```

- `IDLE_MAX`: ngưỡng số ngày "rất tệ" (mặc định = 7 ngày, cấu hình được). Nếu `avg_idle_days >= IDLE_MAX` → 100.
- Nếu trong kỳ không có task mới → `TaskIdleDaysNorm = 0`.

#### (4) RescheduleFrequency → RescheduleFrequencyNorm – Số lần dời lịch trung bình mỗi task

```
total_reschedules = tổng số lần dời lịch thủ công + tổng số lần bấm nút "Tái cấu trúc"
                     (đếm từ behavior_logs trong kỳ, bao gồm cả Penalty Log)

tasks_in_period = tổng số task có schedule_slots trong kỳ

avg_reschedule = total_reschedules / tasks_in_period   (nếu tasks_in_period > 0)

RescheduleFrequencyNorm = min(100, (avg_reschedule / RESCHEDULE_MAX) * 100)
```

- `RESCHEDULE_MAX`: ngưỡng số lần dời lịch trung bình "rất tệ" (mặc định = 3 lần/task, cấu hình được).
- Nếu `tasks_in_period = 0` → `RescheduleFrequencyNorm = 0`.

#### (5) TimeDurationAccuracy → TimeDurationAccuracyNorm – Độ lệch giữa thời gian ước tính và thời gian thực tế

```
deviation(task) = |actual_duration - estimated_duration| / estimated_duration
                  (chỉ tính với task đã hoàn thành, estimated_duration > 0)

avg_deviation = average(deviation(task)) với mọi task hoàn thành trong kỳ

TimeDurationAccuracyNorm = min(100, avg_deviation * 100)
```

- `avg_deviation = 0` → ước tính chính xác hoàn toàn → góp phần 0 điểm vào ProcrastinationScore.
- `avg_deviation >= 1` (lệch >= 100%, ví dụ ước 1h nhưng làm 2h+) → đạt mức tối đa 100.
- Nếu không có task hoàn thành nào trong kỳ → `TimeDurationAccuracyNorm = 0`.

### 2.4. Phân loại trạng thái năng suất

Dựa trên `ProcrastinationScore` tính được:

| Khoảng điểm | Phân loại |
| --- | --- |
| 0 – 30 | **Tốt** |
| 31 – 60 | **Trung bình** |
| 61 – 100 | **Cần can thiệp** |

### 2.5. Lưu trữ

Mỗi lần job chạy (00:00 hàng ngày), lưu một record vào `procrastination_scores` gồm:
- 5 giá trị thành phần đã chuẩn hóa: `delay_rate`, `deadline_miss_rate`, `task_idle_days` (norm), `reschedule_frequency` (norm), `time_duration_accuracy` (norm).
- `total_score` (kết quả công thức tổng).
- `classification` (Tốt / Trung bình / Cần can thiệp).
- `date` (ngày tính điểm).

Việc lưu riêng từng thành phần giúp:
- Hiển thị breakdown lý do điểm tăng/giảm trên giao diện Analytics.
- Làm input cho `ProcrastinationRisk` trong công thức Priority Score (mục 1.3.5).
- Làm dữ liệu tổng hợp gửi cho Gemini API khi sinh AI Insights hàng tuần.

### 2.6. Trường hợp người dùng mới / thiếu dữ liệu

- Nếu trong kỳ quan sát người dùng không có bất kỳ task/schedule/pomodoro nào → tất cả thành phần = 0 → `ProcrastinationScore = 0` → phân loại **Tốt** (mặc định lạc quan cho người dùng mới), kèm ghi chú "chưa đủ dữ liệu để đánh giá chính xác" trên giao diện.
- Các thành phần có mẫu số = 0 đều được xử lý trả về 0 trước khi đưa vào công thức tổng (tránh chia cho 0 / NaN).

---

## 3. Cấu hình trọng số (system_configs)

Tất cả các trọng số và ngưỡng dưới đây nên được lưu dưới dạng key-value trong bảng `system_configs`, có giá trị mặc định và cho phép Admin chỉnh sửa qua API quản trị:

| Key | Mô tả | Giá trị mặc định |
| --- | --- | --- |
| `priority_weight_urgency` (w1) | Trọng số Urgency | 0.25 |
| `priority_weight_importance` (w2) | Trọng số Importance | 0.25 |
| `priority_weight_deadline_pressure` (w3) | Trọng số DeadlinePressure | 0.20 |
| `priority_weight_energy_fit` (w4) | Trọng số EnergyFit | 0.15 |
| `priority_weight_procrastination_risk` (w5) | Trọng số ProcrastinationRisk | 0.15 |
| `urgency_d_max` | Ngưỡng số ngày D_max cho Urgency | 14 |
| `procrastination_weight_delay_rate` (u1) | Trọng số DelayRate | 0.25 |
| `procrastination_weight_deadline_miss` (u2) | Trọng số DeadlineMissRate | 0.25 |
| `procrastination_weight_idle_days` (u3) | Trọng số TaskIdleDaysNorm | 0.20 |
| `procrastination_weight_reschedule` (u4) | Trọng số RescheduleFrequencyNorm | 0.15 |
| `procrastination_weight_duration_accuracy` (u5) | Trọng số TimeDurationAccuracyNorm | 0.15 |
| `procrastination_idle_max_days` | Ngưỡng IDLE_MAX | 7 |
| `procrastination_reschedule_max` | Ngưỡng RESCHEDULE_MAX | 3 |
| `procrastination_period_days` | Số ngày của kỳ quan sát | 14 |

> Khi Admin cập nhật trọng số, hệ thống nên kiểm tra `sum(w1..w5) ≈ 1` và `sum(u1..u5) ≈ 1` (cho phép sai số nhỏ do số thực) trước khi lưu, để đảm bảo điểm số vẫn nằm trong thang [0, 100].


## 3. Greedy Scheduling algorithm ( Thuật toán tham lam) - Lắp task vào timeslot bằng PQ**

- Sort tasks by Priority Score (Max-heap)
- Lấy task có PS cao nhất
- Tìm time slot trống kế tiếp, bỏ qua "risky hours"
- Lặp lại cho đến hết task queue

**Risky hours** = khung giờ có delay rate > 60% hoặc stoppedEarly rate > 50% từ behavior log của user. Ví dụ: 20h–22h user hay dừng sớm → hệ thống tự né khi schedule Q1 tasks.

**Priority Queue is here to implement Greedy Scheduling.** Hai thứ không tách nhau — Priority Queue là *cách lưu trữ* , Greedy Scheduling là *thuật toán sử dụng nó* .
- Priority Queue ở  đề tài này là **Max-Heap** — cây nhị phân hoàn chỉnh mà node cha luôn có Priority Score ≥ node con. Kết quả: `extractMax()`luôn lấy ra task có PS cao nhất trong O(log n).
