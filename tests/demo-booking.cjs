const { chromium, expect } = require('@playwright/test');
const { readFileSync, existsSync } = require('node:fs');
const assert = require('node:assert/strict');

let stage = 'initialization';
async function main() {
    if (!process.argv.includes('--run')) throw new Error('Explicit --run is required to create and cancel a local demo booking.');
    const { DEMO_CREDENTIALS_FILE, DEMO_COURTS, DEMO_USERS, demoSubCourts } = await import('../backend/src/demo/demoData.js');
    const { accounts } = JSON.parse(readFileSync(DEMO_CREDENTIALS_FILE, 'utf8'));
    assert.equal(accounts.length, 2);
    for (const user of DEMO_USERS) assert.ok(accounts.some(account => account._id === user._id && account.email === user.email));
    const date = new Date(Date.now() + 2 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    const court = DEMO_COURTS[0];
    const lane = demoSubCourts(court)[1];
    const url = `http://localhost/courts/${court._id}?date=${date}`;
    const detail = await (await fetch(`http://localhost/api/courts/${court._id}?date=${date}`)).json();
    const slot = detail.court?.subCourtsTimeline?.find(sub => sub._id === lane._id)?.slots.find(item => item.startTime === '19:00');
    assert.ok(slot && !slot.isBooked && !slot.isPast && !slot.isMaintenance, 'The reserved demo test slot must be free before starting.');
    const browser = await chromium.launch(existsSync(chromium.executablePath()) ? { headless: true } : { channel: 'msedge', headless: true });
    const sessions = [];
    const createdBookings = [];
    const captures = [];
    let verified = false;
    let cleanupSucceeded = true;
    try {
        for (let index = 0; index < 2; index++) {
            stage = `UI login for demo player ${index + 1}`;
            const account = accounts.find(item => item._id === DEMO_USERS[index]._id);
            const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
            const page = await context.newPage();
            page.setDefaultTimeout(20000);
            await page.goto('http://localhost/login');
            await page.locator('input[type=email]').fill(account.email);
            await page.locator('input[type=password]').fill(account.password);
            const loginResponse = page.waitForResponse(response => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
            await page.locator('form button[type=submit]').click();
            const response = await loginResponse;
            assert.equal(response.status(), 200, 'Demo UI login failed.');
            const login = await response.json();
            assert.equal(login.user.id, account._id);
            sessions.push({ page, context, token: login.accessToken });
            await page.waitForURL(current => current.pathname === '/');
            page.on('response', bookingResponse => {
                if (bookingResponse.url().endsWith('/api/bookings') && bookingResponse.request().method() === 'POST' && bookingResponse.status() === 201) {
                    captures.push(bookingResponse.json().then(body => {
                        if (body.success && body.bookingId && bookingResponse.request().postDataJSON()?.slotId === slot._id) {
                            createdBookings.push({ id: body.bookingId, token: login.accessToken });
                        }
                    }));
                }
            });
            stage = `Prepare the same free slot for demo player ${index + 1}`;
            await page.goto(url);
            await page.getByRole('button', { name: `${lane.name}, 19:00: Trống`, exact: true }).click();
            await page.getByRole('button', { name: /Tiến Hành Đặt Lịch/ }).click();
            await expect(page.getByRole('dialog')).toBeVisible();
        }
        stage = 'First player confirms the booking';
        const first = sessions[0].page;
        const wonResponse = first.waitForResponse(response => response.url().endsWith('/api/bookings') && response.request().method() === 'POST');
        await first.getByRole('dialog').getByRole('button', { name: 'Đặt sân', exact: true }).click();
        assert.equal((await wonResponse).status(), 201);
        await expect(first.getByRole('heading', { name: 'Đã gửi yêu cầu đặt sân', exact: true })).toBeVisible();

        stage = 'Second player confirms a stale choice and sees the conflict';
        const second = sessions[1].page;
        const lostResponse = second.waitForResponse(response => response.url().endsWith('/api/bookings') && response.request().method() === 'POST');
        await second.getByRole('dialog').getByRole('button', { name: 'Đặt sân', exact: true }).click();
        const lost = await lostResponse;
        assert.equal(lost.status(), 409);
        assert.equal((await lost.json()).code, 'SLOT_ALREADY_BOOKED');
        await expect(second.getByRole('dialog')).toHaveCount(0);
        await expect(second.getByRole('alert')).toContainText('Ô giờ này đã có người đặt');
        await expect(second.getByRole('button', { name: `${lane.name}, 19:00: Đã có người đặt`, exact: true })).toBeDisabled();
        await expect(second.getByRole('button', { name: /Vui lòng chọn Sân & Giờ trống/ })).toBeDisabled();
        verified = true;
    } finally {
        await Promise.allSettled(captures);
        // Only cancel a booking created by this run; never touch the API demo sample.
        for (const booking of createdBookings) {
            try {
                const cancel = await fetch(`http://localhost/api/bookings/${booking.id}/cancel`, {
                    method: 'PUT', headers: { Authorization: `Bearer ${booking.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cancelReason: 'DEMO browser verification completed; release this test slot.' })
                });
                if (cancel.status !== 200) cleanupSucceeded = false;
            } catch { cleanupSucceeded = false; }
        }
        for (const session of sessions) {
            await fetch('http://localhost/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }).catch(() => {});
        }
        await browser.close();
        if (!cleanupSucceeded) throw new Error('A browser test booking could not be cancelled; inspect demo history.');
    }
    stage = 'Verify cleanup';
    assert.ok(verified);
    const after = await (await fetch(`http://localhost/api/courts/${court._id}?date=${date}`)).json();
    assert.equal(after.court.subCourtsTimeline.find(sub => sub._id === lane._id).slots.find(item => item._id === slot._id).isBooked, false);
    console.log(JSON.stringify({ success: true, date, court: court.name, lane: lane.name, time: '19:00–20:00', uiLogins: 2, firstStatus: 201, secondStatus: 409, visibleAlreadyBookedAlert: true, staleSelectionCleared: true, conflictSlotDisabled: true, ownTestBookingCancelled: true }, null, 2));
}

main().catch(error => {
    // Playwright fill errors may contain entered text: never print raw error messages or traces.
    console.error(JSON.stringify({ success: false, stage, errorType: error.name }));
    process.exitCode = 1;
});
