import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldEnsureDataset } from '../src/utils/datasetEnsure.ts';

test('unset or empty keeps creating the dataset, as a standalone app expects', () => {
  assert.equal(shouldEnsureDataset(undefined), true);
  assert.equal(shouldEnsureDataset(''), true);
  assert.equal(shouldEnsureDataset('  '), true);
});

test('a host that provisions the dataset turns it off', () => {
  for (const off of ['0', 'false', 'off', 'no', ' OFF ']) {
    assert.equal(shouldEnsureDataset(off), false, off);
  }
});

test('explicitly on', () => {
  for (const on of ['1', 'true', 'on', 'yes']) {
    assert.equal(shouldEnsureDataset(on), true, on);
  }
});

test('anything else is refused rather than guessed', () => {
  for (const bad of ['2', 'nope', 'disabled']) {
    assert.throws(() => shouldEnsureDataset(bad), /LINKED_DATASET_ENSURE/, bad);
  }
});
