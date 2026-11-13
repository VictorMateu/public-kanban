import assert from "node:assert/strict";
import { test } from "node:test";
import { createVideoSequence, finishVideoSequence, preparedVideoFrame, prepareVideoTransition, videoCycleDuration } from "../lib/animation/video-sequence.ts";

test("typing videos replay immediately until their sampled drinking interval", () => {
  let state = createVideoSequence(() => 0);
  for (let index = 0; index < 2; index++) state = finishVideoSequence(state, 2);
  assert.equal(state.sequence, "typing");
  assert.equal(state.typingMs, 4_000);
  state = finishVideoSequence(state, 2);
  assert.equal(state.sequence, "drinking");
});

test("unknown browser duration uses the encoded clip duration so the first drink still occurs", () => {
  let state = createVideoSequence(() => 0);
  for (let index = 0; index < 3; index++) {
    state = finishVideoSequence(state, videoCycleDuration(Number.POSITIVE_INFINITY, 2.209));
  }
  assert.equal(state.sequence, "drinking");
  assert.equal(videoCycleDuration(2.2, 2.209), 2.2);
});

test("a drink returns to typing with a newly sampled interval", () => {
  const drinking = finishVideoSequence(createVideoSequence(() => 0), 16);
  const returned = finishVideoSequence(drinking, 5.5, () => 0.5);
  assert.equal(returned.sequence, "typing");
  assert.equal(returned.typingMs, 0);
  assert.equal(returned.drinkAfterMs, 22_500);
  assert.equal(drinking.sequence, "drinking");
});

test("unknown media duration cannot accidentally start or finish a drink", () => {
  const state = createVideoSequence();
  for (const duration of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(finishVideoSequence(state, duration), state);
  }
});

test("a drink is prepared without seeking the currently visible typing video", () => {
  const calls: string[] = [];
  const typing = { currentTime: 0.02, pause: () => { calls.push("hold-typing"); }, play: async () => {} };
  const drinking = { currentTime: 5.459, pause: () => {}, play: async () => { calls.push("start-drinking"); } };
  prepareVideoTransition(typing, drinking);
  assert.equal(typing.currentTime, 0.02);
  assert.equal(drinking.currentTime, 0);
  assert.deepEqual(calls, ["hold-typing"]);
});

test("preparing a transition does not start a hidden clip and rejects seeking the visible video", () => {
  let played = false;
  const video = { currentTime: 2, pause: () => {}, play: async () => { played = true; } };
  prepareVideoTransition(null, video);
  assert.equal(played, false);
  assert.throws(() => prepareVideoTransition(video, video));
});

test("the next clip is shown only after its first frame is decoded and its seek has finished", () => {
  assert.equal(preparedVideoFrame({ readyState: 1, seeking: false }), false);
  assert.equal(preparedVideoFrame({ readyState: 4, seeking: true }), false);
  assert.equal(preparedVideoFrame({ readyState: 2, seeking: false }), true);
});
