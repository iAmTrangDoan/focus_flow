import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Lock,
  Unlock,
  ChevronRight,
  ListTodo,
  Calendar,
  Mail,
  Shield,
  Clock,
} from 'lucide-react';
import { Badge, ConfirmModal, SkeletonLoader } from '../../components/ui';
import adminService, { type AdminUserListItem, type AdminUserDetail } from '../../services/admin.service';
import { createToast, type ToastMessage } from '../../components/common/Toast';

type FilterTab = 'all' | 'active' | 'inactive';

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'inactive', label: 'Đã khóa' },
];

interface AdminUsersPageProps {
  onToast?: (toast: ToastMessage) => void;
}

export function AdminUsersPage({ onToast }: AdminUsersPageProps) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Destructive Action Modal state
  const [userToToggle, setUserToToggle] = useState<AdminUserListItem | null>(null);
  const [toggling, setToggling] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    adminService
      .getUsers()
      .then((data) => {
        setUsers(data);
      })
      .catch(() => {
        if (onToast) onToast(createToast('error', 'Không thể tải danh sách người dùng từ server'));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesFilter =
        filter === 'all' ? true : filter === 'active' ? u.isActive : !u.isActive;
      const q = search.toLowerCase().trim();
      const displayName = u.displayName || '';
      const email = u.email || '';
      const matchesSearch = !q || displayName.toLowerCase().includes(q) || email.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [users, filter, search]);

  const handleSelectUser = async (user: AdminUserListItem) => {
    setLoadingDetail(true);
    try {
      const detail = await adminService.getUserDetail(user.id);
      setSelectedUserDetail(detail);
    } catch {
      setSelectedUserDetail(user);
    } finally {
      setLoadingDetail(false);
    }
  };

  const confirmToggleUserStatus = async () => {
    if (!userToToggle) return;
    setToggling(true);
    try {
      const updated = await adminService.toggleUserActive(userToToggle.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === updated.id ? { ...u, isActive: updated.isActive } : u))
      );

      if (selectedUserDetail?.id === updated.id) {
        setSelectedUserDetail((prev) => (prev ? { ...prev, isActive: updated.isActive } : null));
      }

      const actionText = updated.isActive ? 'Mở khóa' : 'Khóa';
      if (onToast) {
        onToast(createToast('success', `Đã ${actionText.toLowerCase()} tài khoản ${updated.email}`));
      }
    } catch {
      if (onToast) {
        onToast(createToast('error', 'Cập nhật trạng thái người dùng thất bại'));
      }
    } finally {
      setToggling(false);
      setUserToToggle(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#243024]">Quản lý người dùng</h1>
        <p className="mt-1 text-sm text-gray-500">
          Quản lý danh sách tài khoản, trạng thái khóa/hoạt động và vai trò trong hệ thống
        </p>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 rounded-2xl bg-[#F4FAF4] p-1 border border-[#E8F5E8]">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-white text-[#243024] shadow-sm'
                  : 'text-gray-500 hover:text-[#243024]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full rounded-xl border border-[#E8F5E8] bg-white pl-10 pr-4 py-2 text-sm text-[#243024] focus:outline-none focus:ring-2 focus:ring-[#5FAF6E]"
          />
        </div>
      </div>

      {/* Main content grid: Table + Detail Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Table Column */}
        <div className={`overflow-hidden rounded-2xl border border-[#E8F5E8] bg-white shadow-sm ${selectedUserDetail ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {loading ? (
            <div className="p-6">
              <SkeletonLoader variant="table" rows={6} cols={5} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-gray-400">Không tìm thấy người dùng phù hợp</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E8F5E8] bg-[#F4FAF4]/50 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <th className="px-5 py-3.5">Người dùng</th>
                    <th className="px-5 py-3.5">Vai trò</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 hidden sm:table-cell">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8F5E8]">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUserDetail?.id === user.id;
                    const initial = (user.displayName?.[0] || user.email[0]).toUpperCase();
                    return (
                      <tr
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#DDF3DF]/40' : 'hover:bg-[#F4FAF4]'
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DDF3DF] text-sm font-bold text-[#5FAF6E]">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#243024]">
                                {user.displayName || 'Chưa đặt tên'}
                              </p>
                              <p className="truncate text-xs text-gray-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={user.role === 'ADMIN' ? 'danger' : 'info'}>{user.role}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {user.isActive ? (
                            <Badge variant="success">HOẠT ĐỘNG</Badge>
                          ) : (
                            <Badge variant="neutral">ĐÃ KHÓA</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden sm:table-cell text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setUserToToggle(user)}
                              className={`p-2 rounded-xl transition-colors ${
                                user.isActive
                                  ? 'text-amber-600 hover:bg-amber-50'
                                  : 'text-[#5FAF6E] hover:bg-[#DDF3DF]'
                              }`}
                              title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectUser(user)}
                              className="p-2 text-gray-400 hover:text-[#243024] hover:bg-gray-100 rounded-xl transition-colors"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Detail Panel */}
        {selectedUserDetail && (
          <div className="rounded-2xl border border-[#E8F5E8] bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#E8F5E8] pb-4">
              <h3 className="text-base font-bold text-[#243024]">Chi tiết tài khoản</h3>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
              >
                Đóng
              </button>
            </div>

            {loadingDetail ? (
              <SkeletonLoader variant="text" lines={6} />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#DDF3DF] text-xl font-black text-[#5FAF6E]">
                    {(selectedUserDetail.displayName?.[0] || selectedUserDetail.email[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-[#243024] truncate">
                      {selectedUserDetail.displayName || 'Chưa đặt tên'}
                    </h4>
                    <p className="text-xs text-gray-400 truncate">{selectedUserDetail.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={selectedUserDetail.isActive ? 'success' : 'neutral'}>
                        {selectedUserDetail.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </Badge>
                      <Badge variant="info">{selectedUserDetail.role}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <DetailItem
                    icon={<Mail className="h-4 w-4 text-gray-400" />}
                    label="Email"
                    value={selectedUserDetail.email}
                  />
                  <DetailItem
                    icon={<Shield className="h-4 w-4 text-gray-400" />}
                    label="Múi giờ"
                    value={selectedUserDetail.timezone || 'Asia/Ho_Chi_Minh'}
                  />
                  <DetailItem
                    icon={<Calendar className="h-4 w-4 text-gray-400" />}
                    label="Ngày tham gia"
                    value={new Date(selectedUserDetail.createdAt).toLocaleDateString('vi-VN')}
                  />
                  {selectedUserDetail._count && (
                    <>
                      <DetailItem
                        icon={<ListTodo className="h-4 w-4 text-[#5FAF6E]" />}
                        label="Tổng số Task"
                        value={String(selectedUserDetail._count.tasks)}
                      />
                      <DetailItem
                        icon={<Clock className="h-4 w-4 text-[#5FAF6E]" />}
                        label="Phiên Pomodoro"
                        value={String(selectedUserDetail._count.pomodoroSessions)}
                      />
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-[#E8F5E8]">
                  <button
                    type="button"
                    onClick={() => setUserToToggle(selectedUserDetail)}
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                      selectedUserDetail.isActive
                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        : 'bg-[#5FAF6E] text-white hover:bg-[#4a9354]'
                    }`}
                  >
                    {selectedUserDetail.isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản này'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Destructive Action */}
      <ConfirmModal
        open={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={confirmToggleUserStatus}
        loading={toggling}
        title={userToToggle?.isActive ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
        variant={userToToggle?.isActive ? 'warning' : 'info'}
        confirmLabel={userToToggle?.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
        message={
          userToToggle && (
            <span>
              Bạn có chắc chắn muốn <strong>{userToToggle.isActive ? 'khóa' : 'mở khóa'}</strong> tài khoản{' '}
              <strong className="text-black">{userToToggle.email}</strong>?
              {userToToggle.isActive
                ? ' Người dùng sẽ tạm thời không thể đăng nhập vào ứng dụng.'
                : ' Người dùng sẽ có thể đăng nhập bình thường.'}
            </span>
          )
        }
      />
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4FAF4]/50">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-xs font-bold text-[#243024]">{value}</span>
    </div>
  );
}

export default AdminUsersPage;
