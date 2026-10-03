import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkedPackage } from '@_linked/core/utils/Package';
import { getNodeShapeUri } from '@_linked/core/shapes/SHACL';
import { resolveBaseUri } from '../src/utils/baseUri.ts';

test('unset or empty keeps the framework default', () => {
  assert.equal(resolveBaseUri(undefined), undefined);
  assert.equal(resolveBaseUri(''), undefined);
  assert.equal(resolveBaseUri('   '), undefined);
});

test('a root gets the trailing slash IRIs are appended to', () => {
  assert.equal(resolveBaseUri('https://acme.example.org'), 'https://acme.example.org/');
  assert.equal(resolveBaseUri('https://acme.example.org/'), 'https://acme.example.org/');
  assert.equal(resolveBaseUri(' https://example.org/ns '), 'https://example.org/ns/');
});

test('anything but an absolute http(s) URI is refused', () => {
  for (const bad of ['acme', 'ftp://example.org/', 'https://', 'https://a b/', 'https://example.org/?q', 'https://example.org/#x']) {
    assert.throws(() => resolveBaseUri(bad), /LINKED_BASE_URI/, bad);
  }
});

test("the package's shapes are minted under the configured root", () => {
  const baseUri = resolveBaseUri('https://acme.example.org');
  linkedPackage('base-uri-probe', { baseUri });
  assert.equal(getNodeShapeUri('base-uri-probe', 'Foo'), 'https://acme.example.org/shape/base-uri-probe/Foo');
});

test('without a root the default stays as before', () => {
  linkedPackage('base-uri-default-probe', undefined);
  assert.equal(getNodeShapeUri('base-uri-default-probe', 'Foo'), 'https://linked.cm/shape/base-uri-default-probe/Foo');
});
