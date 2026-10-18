import { test, expect } from '@playwright/test';

test('Admin Full Flow Navigation Automated Test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'PickleballPro' })).toBeVisible();

  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /đăng nhập/i })).toBeVisible();

  await page.getByRole('textbox', { name: 'name@club.com' }).click();
  await page.getByRole('textbox', { name: 'name@club.com' }).fill('admin@gmail.com');
  await page.getByRole('textbox', { name: 'name@club.com' }).press('Tab');
  await page.getByRole('textbox', { name: 'Nhập mật khẩu' }).fill('123456');
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/admin(?:\/)?$/);
  await expect(page.getByRole('heading', { name: 'Dashboard tổng quan' })).toBeVisible();

  await page.getByRole('link', { name: 'sports_tennis Sân' }).click();
  await expect(page).toHaveURL(/\/admin\/courts$/);
  await expect(page.getByRole('heading', { name: 'Quản lý Sân' })).toBeVisible();

  await page.getByRole('link', { name: 'event_available Booking' }).click();
  await expect(page).toHaveURL(/\/admin\/bookings$/);
  await expect(page.getByRole('heading', { name: 'Quản lý Booking' })).toBeVisible();

  await page.getByRole('link', { name: 'inventory_2 Thiết bị' }).click();
  await expect(page).toHaveURL(/\/admin\/equipments$/);
  await expect(page.getByRole('heading', { name: 'Quản lý Kho & Thiết bị' })).toBeVisible();

  await page.getByRole('link', { name: 'build Bảo trì' }).click();
  await expect(page).toHaveURL(/\/admin\/maintenance$/);
  await expect(page.getByRole('heading', { name: 'Quản lý Bảo trì' })).toBeVisible();

  await page.getByRole('link', { name: 'group Người dùng' }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole('heading', { name: 'Quản lý Người dùng' })).toBeVisible();

  await page.getByRole('link', { name: 'sell Mã giảm giá' }).click();
  await expect(page).toHaveURL(/\/admin\/coupons$/);
  await expect(page.getByRole('heading', { name: 'Quản lý mã giảm giá' })).toBeVisible();

  await page.getByRole('link', { name: 'rate_review Đánh giá' }).click();
  await expect(page).toHaveURL(/\/admin\/reviews$/);
  await expect(page.getByRole('heading', { name: 'Duyệt đánh giá' })).toBeVisible();

  await page.getByRole('link', { name: 'account_circle Hồ sơ' }).click();
  await expect(page).toHaveURL(/\/admin\/profile$/);
  await expect(page.getByRole('heading', { name: 'Hồ sơ quản trị viên' })).toBeVisible();

  await page.getByRole('link', { name: 'settings Cấu hình' }).click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.getByRole('heading', { name: 'Cấu hình Hệ thống' })).toBeVisible();

  await page.getByRole('button', { name: 'notifications' }).click();
  await expect(page.getByText(/^Thông báo$/)).toBeVisible();

  await page.getByRole('button', { name: 'logout Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('User Full Flow Navigation Automated Test', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'PickleballPro' })).toBeVisible();

  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole('textbox', { name: 'name@club.com' }).click();
  await page.getByRole('textbox', { name: 'name@club.com' }).fill('user1@gmail.com');
  await page.getByRole('textbox', { name: 'Nhập mật khẩu' }).click();
  await page.getByRole('textbox', { name: 'Nhập mật khẩu' }).fill('123456');
  await page.locator('form').getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'PickleballPro' })).toBeVisible();

  await page.getByRole('link', { name: 'sports_tennis Sân bóng' }).click();
  await expect(page).toHaveURL(/\/courts$/);
  await expect(page.getByRole('heading', { name: 'Khám phá sân bóng' })).toBeVisible();

  await page.getByRole('link', { name: 'favorite Yêu thích' }).click();
  await expect(page).toHaveURL(/\/user\/favorites$/);
  await expect(page.getByRole('heading', { name: 'Sân yêu thích' })).toBeVisible();

  await page.getByRole('link', { name: 'workspace_premium Ưu đãi' }).click();
  await expect(page).toHaveURL(/\/user\/rewards$/);
  await expect(page.getByRole('heading', { name: 'Điểm & Ưu đãi' })).toBeVisible();


  await page.getByRole('button', { name: 'notifications' }).click();
  await expect(page.getByText(/^Thông báo$/)).toBeVisible();

  await page.getByRole('link', { name: 'user1 user1 Người chơi' }).click();
  await expect(page).toHaveURL(/\/user\/profile$/);
  await expect(page.getByRole('heading', { name: 'Hồ sơ cá nhân' })).toBeVisible();

  await page.getByRole('button', { name: 'add_circle Đặt sân', exact: true }).click();
  await expect(page).toHaveURL(/\/courts$/);
  await expect(page.getByRole('heading', { name: 'Khám phá sân bóng' })).toBeVisible();

  await page.getByRole('button', { name: 'logout' }).click();
  await expect(page).toHaveURL(/\/login$/);
});