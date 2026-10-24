// نگاشت خطاهای دامنه به پیام فارسی برای نمایش در رابط کاربری
export const faErrorMessage = (error) => {
  if (!error) return 'خطای نامشخص';
  if (error.code === 'AUTH_REQUIRED') return 'برای انجام این عملیات باید وارد حساب کاربری خود شوید.';
  if (error.code === 'FORBIDDEN' || error.code === 'ADMIN_REQUIRED') return error.message || 'دسترسی شما به این عملیات مجاز نیست.';
  return error.message || 'خطای غیرمنتظره در انجام عملیات';
};

export const isAuthError = (error) => error?.code === 'AUTH_REQUIRED';