import test from "node:test";
import assert from "node:assert/strict";
import Review from "../src/models/review.model.js";
import reviewService from "../src/services/review.service.js";

function queryResult(value, captured = {}) {
    return {
        populate(...args) { (captured.populate ||= []).push(args); return this; },
        sort(value) { captured.sort = value; return this; },
        skip(value) { captured.skip = value; return this; },
        limit(value) { captured.limit = value; return this; },
        lean() { return Promise.resolve(value); }
    };
}

test("community reviews only query approved posts and apply requested filters and pagination", async t => {
    const captured = {};
    const find = t.mock.method(Review, "find", () => queryResult([{ _id: "review-1" }], captured));
    const count = t.mock.method(Review, "countDocuments", async () => 13);

    const result = await reviewService.getCommunityReviews({ page: "2", limit: "5", rating: "4", withPhotos: "true", sort: "top" });

    assert.deepEqual(find.mock.calls[0].arguments[0], { status: "APPROVED", rating: 4, "images.0": { $exists: true } });
    assert.deepEqual(captured.sort, { rating: -1, createdAt: -1, _id: -1 });
    assert.equal(captured.skip, 5);
    assert.equal(captured.limit, 5);
    assert.ok(captured.populate.some(([path]) => path === "courtId"));
    assert.deepEqual(count.mock.calls[0].arguments[0], { status: "APPROVED", rating: 4, "images.0": { $exists: true } });
    assert.equal(result.pagination.currentPage, 2);
    assert.equal(result.pagination.totalPages, 3);
    assert.equal(result.pagination.limit, 5);
    assert.deepEqual(result.reviews, [{ _id: "review-1" }]);
});

test("community review filters reject invalid values before querying MongoDB", async t => {
    const find = t.mock.method(Review, "find", () => queryResult([]));
    await assert.rejects(() => reviewService.getCommunityReviews({ rating: "6" }), { status: 400 });
    await assert.rejects(() => reviewService.getCommunityReviews({ sort: "oldest" }), { status: 400 });
    assert.equal(find.mock.callCount(), 0);
});
