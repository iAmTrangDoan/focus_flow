import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, BarChart3, Clock, Zap, Brain, Bell, TrendingUp, Leaf, Target, Sparkles } from 'lucide-react'

interface LandingPageProps {
  onLoginClick: () => void
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
  const features = [
    {
      icon: Target,
      title: 'Quản lý thông minh',
      description: 'Tạo, chia nhỏ và theo dõi công việc với mục tiêu rõ ràng',
      color: 'from-[#DDF3DF] to-[#E8F5EA]',
    },
    {
      icon: Clock,
      title: 'Lập lịch cá nhân hóa',
      description: 'AI hiểu năng suất của bạn và gợi ý thời gian tối ưu',
      color: 'from-[#DCECF8] to-[#E8F3FB]',
    },
    {
      icon: Zap,
      title: 'Focus Sessions',
      description: 'Pomodoro cấu trúc giúp bạn tập trung hoàn toàn',
      color: 'from-[#F7E7A8] to-[#F9EDB3]',
    },
    {
      icon: Brain,
      title: 'Phân tích trì hoãn',
      description: 'Hiểu rõ thói quen trì hoãn thông qua dữ liệu của bạn',
      color: 'from-[#F6D8C7] to-[#F8DDD1]',
    },
    {
      icon: Bell,
      title: 'Nhắc nhở cá nhân',
      description: 'Thông báo đúng lúc, không làm bạn bị xao nhãng',
      color: 'from-[#DDF3DF] to-[#E8F5EA]',
    },
    {
      icon: TrendingUp,
      title: 'Insights & Reports',
      description: 'Xem tiến độ, học hỏi và cải thiện hiệu suất',
      color: 'from-[#DCECF8] to-[#E8F3FB]',
    },
  ]

  const steps = [
    { 
      number: '1', 
      title: 'Thêm công việc', 
      description: 'Ghi lại mọi thứ bạn cần làm một cách dễ dàng',
      icon: CheckCircle
    },
    { 
      number: '2', 
      title: 'AI Scheduling', 
      description: 'Hệ thống gợi ý lịch tối ưu dựa trên năng suất',
      icon: Sparkles
    },
    { 
      number: '3', 
      title: 'Focus Mode', 
      description: 'Bắt đầu phiên tập trung với Pomodoro',
      icon: Zap
    },
    { 
      number: '4', 
      title: 'Improve', 
      description: 'Xem báo cáo và cải thiện hành vi',
      icon: TrendingUp
    },
  ]

  return (
    <div className="min-h-screen bg-[#F4FAF4]">
      {/* Navigation Bar */}
      <nav className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#D9E6D9] z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] flex items-center justify-center text-white">
              <Leaf size={18} />
            </div>
            <h1 className="text-2xl font-bold text-[#243024]">FocusFlow</h1>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#5F6E5F] hover:text-[#243024] transition-colors">
              Tính năng
            </a>
            <a href="#how-it-works" className="text-[#5F6E5F] hover:text-[#243024] transition-colors">
              Cách hoạt động
            </a>
            <a href="#benefits" className="text-[#5F6E5F] hover:text-[#243024] transition-colors">
              Lợi ích
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm">
              Đăng nhập
            </Link>
            <button className="btn-primary text-sm" onClick={onLoginClick}>
              Bắt đầu miễn phí
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#5FAF6E] font-semibold mb-4 uppercase tracking-wide text-sm">Tập trung. Hoàn thành. Cải thiện.</p>
            <h2 className="text-h1 mb-6 text-[#243024]">
              Làm việc thông minh <span className="text-[#5FAF6E]">hơn đơn thuần</span> quản lý việc
            </h2>
            <p className="text-body-lg text-[#5F6E5F] mb-8">
              FocusFlow là trợ lý thông minh giúp bạn tập trung hơn, trì hoãn ít hơn. Với lập lịch AI, Pomodoro thông minh và phân tích hành vi, bạn sẽ làm việc hiệu quả hơn từng ngày.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-primary flex items-center justify-center gap-2 text-base" onClick={onLoginClick}>
                Bắt đầu ngay - Miễn phí
                <ArrowRight size={18} />
              </button>
              <button className="btn-outline text-base">Xem bản demo</button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-br from-[#DDF3DF] via-[#E8F5EA] to-[#DCECF8] rounded-[24px] opacity-40 blur-2xl"></div>
            <div className="card-lg p-8 relative">
              <div className="bg-gradient-to-br from-[#F4FAF4] to-[#E8F5EA] rounded-[16px] h-80 flex flex-col items-center justify-center p-6">
                <div className="bg-white rounded-[14px] p-6 w-full space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#243024]">Hôm nay</p>
                    <span className="text-sm text-[#5FAF6E]">📊 7 ngày streak</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#DDF3DF] rounded-[12px] p-3 text-center">
                      <p className="text-2xl font-bold text-[#5FAF6E]">6</p>
                      <p className="text-xs text-[#5F6E5F]">Việc hôm nay</p>
                    </div>
                    <div className="bg-[#DCECF8] rounded-[12px] p-3 text-center">
                      <p className="text-2xl font-bold text-[#4A7FB8]">75m</p>
                      <p className="text-xs text-[#5F6E5F]">Focus Time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#5FAF6E] font-semibold uppercase text-sm tracking-wide mb-2">Tính năng</p>
            <h3 className="text-h2 text-[#243024]">Mọi thứ bạn cần để tập trung</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div key={index} className="card-lg p-7 bg-gradient-to-br {feature.color} hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-[12px] bg-white/50 flex items-center justify-center mb-4">
                    <Icon className="text-[#5FAF6E]" size={24} />
                  </div>
                  <h4 className="text-h5 text-[#243024] mb-2">{feature.title}</h4>
                  <p className="text-body-sm text-[#5F6E5F]">{feature.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#5FAF6E] font-semibold uppercase text-sm tracking-wide mb-2">Quy trình</p>
            <h3 className="text-h2 text-[#243024]">Bắt đầu trong 4 bước đơn giản</h3>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon
              return (
                <div key={index} className="relative">
                  <div className="card-lg p-8 h-full">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-[14px] bg-[#DDF3DF] flex items-center justify-center mb-4">
                        <Icon className="text-[#5FAF6E]" size={24} />
                      </div>
                      <p className="text-sm font-bold text-[#5FAF6E] mb-2">Bước {step.number}</p>
                      <h4 className="text-h5 text-[#243024] mb-2">{step.title}</h4>
                      <p className="text-body-sm text-[#5F6E5F]">{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <div className="w-6 h-6 rounded-full bg-[#5FAF6E] flex items-center justify-center text-white">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-[#5FAF6E] font-semibold uppercase text-sm tracking-wide mb-2">Lợi ích</p>
            <h3 className="text-h2 text-[#243024]">Tại sao chọn FocusFlow?</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side */}
            <div className="space-y-4">
              <div className="card-lg p-6">
                <h4 className="text-h5 text-[#243024] mb-2 flex items-center gap-2">
                  <CheckCircle size={20} className="text-[#5FAF6E]" />
                  Quản lý toàn diện
                </h4>
                <p className="text-body-sm text-[#5F6E5F]">Không chỉ là danh sách công việc, mà là hệ thống hoàn chỉnh</p>
              </div>
              <div className="card-lg p-6">
                <h4 className="text-h5 text-[#243024] mb-2 flex items-center gap-2">
                  <CheckCircle size={20} className="text-[#5FAF6E]" />
                  Lập lịch thông minh
                </h4>
                <p className="text-body-sm text-[#5F6E5F]">AI học cách làm việc của bạn và gợi ý thời gian tối ưu</p>
              </div>
              <div className="card-lg p-6">
                <h4 className="text-h5 text-[#243024] mb-2 flex items-center gap-2">
                  <CheckCircle size={20} className="text-[#5FAF6E]" />
                  Phân tích trì hoãn
                </h4>
                <p className="text-body-sm text-[#5F6E5F]">Hiểu rõ tại sao bạn trì hoãn và cách khắc phục</p>
              </div>
            </div>

            {/* Right Side */}
            <div className="space-y-4">
              <div className="card-lg p-6 bg-[#DDF3DF]">
                <h4 className="text-h5 text-[#243024] mb-2 flex items-center gap-2">
                  <Zap size={20} className="text-[#5FAF6E]" />
                  Focus Sessions
                </h4>
                <p className="text-body-sm text-[#5F6E5F]">Pomodoro giúp bạn vào trạng thái tập trung hoàn toàn</p>
              </div>
              <div className="card-lg p-6 bg-[#DCECF8]">
                <h4 className="text-h5 text-[#243024] mb-2 flex items-center gap-2">
                  <TrendingUp size={20} className="text-[#4A7FB8]" />
                  Insight & Reports
                </h4>
                <p className="text-body-sm text-[#5F6E5F]">Xem tiến độ rõ ràng và cải thiện liên tục</p>
              </div>
              <div className="card-lg p-6 bg-[#F7E7A8]/30">
                <h4 className="text-h5 text-[#243024] mb-2 flex items-center gap-2">
                  <Bell size={20} className="text-[#B8860B]" />
                  Nhắc nhở cá nhân
                </h4>
                <p className="text-body-sm text-[#5F6E5F]">Thông báo đúng lúc, không xao nhãng</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[#5FAF6E] via-[#7BC47F] to-[#5FAF6E]">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h3 className="text-h2 text-white mb-4">Sẵn sàng tập trung hơn?</h3>
          <p className="text-lg text-white/90 mb-8">
            Bắt đầu sử dụng FocusFlow ngay hôm nay - hoàn toàn miễn phí. Không cần thẻ tín dụng.
          </p>
          <button
            className="bg-white text-[#5FAF6E] font-bold py-3 px-8 rounded-[14px] hover:bg-[#DDF3DF] transition-colors inline-flex items-center gap-2 text-lg"
            onClick={onLoginClick}
          >
            Bắt đầu miễn phí
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-[#D9E6D9] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#5FAF6E] to-[#7BC47F] flex items-center justify-center text-white">
                  <Leaf size={18} />
                </div>
                <h4 className="font-bold text-[#243024]">FocusFlow</h4>
              </div>
              <p className="text-body-sm text-[#5F6E5F]">Trợ lý thông minh cho năng suất tối ưu</p>
            </div>
            <div>
              <h4 className="font-bold text-[#243024] mb-4">Pháp lý</h4>
              <ul className="space-y-2 text-body-sm">
                <li>
                  <a href="#" className="text-[#5F6E5F] hover:text-[#5FAF6E]">
                    Điều khoản dịch vụ
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#5F6E5F] hover:text-[#5FAF6E]">
                    Chính sách bảo mật
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#243024] mb-4">Liên hệ</h4>
              <ul className="space-y-2 text-body-sm">
                <li>
                  <a href="#" className="text-[#5F6E5F] hover:text-[#5FAF6E]">
                    support@focusflow.com
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#5F6E5F] hover:text-[#5FAF6E]">
                    Twitter
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-[#243024] mb-4">Sản phẩm</h4>
              <ul className="space-y-2 text-body-sm">
                <li>
                  <a href="#" className="text-[#5F6E5F] hover:text-[#5FAF6E]">
                    Tính năng
                  </a>
                </li>
                <li>
                  <a href="#" className="text-[#5F6E5F] hover:text-[#5FAF6E]">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#D9E6D9] pt-8 text-center text-body-sm text-[#5F6E5F]">
            <p>&copy; 2024 FocusFlow. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
