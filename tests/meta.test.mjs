// Testes das regras puras da integração Instagram.
// Rodar com: npm test   (usa o test runner nativo do Node, sem dependências)

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canManageInstagram,
  canViewInstagram,
} from "../lib/meta/permissions.ts";
import {
  capabilityStatus,
  connectionHealth,
} from "../lib/meta/connection-health.ts";

const CLIENT_A = "11111111-1111-1111-1111-111111111111";
const CLIENT_B = "22222222-2222-2222-2222-222222222222";

const profile = (role, permissions = {}, client_id = null, active = true) => ({
  id: "user",
  role,
  active,
  client_id,
  permissions,
});

test("admin gerencia qualquer cliente", () => {
  assert.equal(canManageInstagram(profile("admin"), CLIENT_A), true);
  assert.equal(canManageInstagram(profile("admin"), CLIENT_B), true);
});

test("team só gerencia com client_management", () => {
  assert.equal(canManageInstagram(profile("team", { client_management: true }), CLIENT_A), true);
  assert.equal(canManageInstagram(profile("team", { marketing: true }), CLIENT_A), false);
  assert.equal(canManageInstagram(profile("team", null), CLIENT_A), false);
});

test("client nunca gerencia, nem o próprio", () => {
  assert.equal(canManageInstagram(profile("client", {}, CLIENT_A), CLIENT_A), false);
});

test("client vê só o próprio status", () => {
  assert.equal(canViewInstagram(profile("client", {}, CLIENT_A), CLIENT_A), true);
  assert.equal(canViewInstagram(profile("client", {}, CLIENT_A), CLIENT_B), false);
  assert.equal(canViewInstagram(profile("client", {}, null), CLIENT_A), false);
});

test("perfil inativo não gerencia nem vê", () => {
  assert.equal(canManageInstagram(profile("admin", {}, null, false), CLIENT_A), false);
  assert.equal(canViewInstagram(profile("client", {}, CLIENT_A, false), CLIENT_A), false);
});

test("client_id vazio é negado", () => {
  assert.equal(canManageInstagram(profile("admin"), ""), false);
});

const NOW = new Date("2026-11-10T12:00:00Z");
const days = (n) => new Date(NOW.getTime() + n * 86400000).toISOString();
const conn = (overrides = {}) => ({
  status: "active",
  token_expires_at: null,
  last_synced_at: days(-1),
  granted_scopes: [],
  ...overrides,
});

test("sem conexão", () => {
  assert.equal(connectionHealth(null, NOW).level, "none");
});

test("ativa, sem expiração e sincronizada", () => {
  const health = connectionHealth(conn(), NOW);
  assert.equal(health.level, "ok");
  assert.equal(health.needsReconnect, false);
});

test("revogada pede reconexão", () => {
  const health = connectionHealth(conn({ status: "revoked" }), NOW);
  assert.equal(health.level, "error");
  assert.equal(health.needsReconnect, true);
});

test("token vencido pede reconexão mesmo com status active", () => {
  const health = connectionHealth(conn({ token_expires_at: days(-1) }), NOW);
  assert.equal(health.label, "Token expirado");
  assert.equal(health.needsReconnect, true);
});

test("expira em até 7 dias gera aviso de renovação", () => {
  const health = connectionHealth(conn({ token_expires_at: days(3) }), NOW);
  assert.equal(health.level, "warning");
  assert.match(health.message, /3 dias/);
  assert.equal(health.needsReconnect, true);
});

test("expira em 1 dia usa singular", () => {
  assert.match(connectionHealth(conn({ token_expires_at: days(1) }), NOW).message, /1 dia\./);
});

test("expiração distante não gera aviso", () => {
  assert.equal(connectionHealth(conn({ token_expires_at: days(40) }), NOW).level, "ok");
});

test("erro de sincronização não exige reconexão imediata", () => {
  const health = connectionHealth(conn({ status: "error" }), NOW);
  assert.equal(health.level, "error");
  assert.equal(health.needsReconnect, false);
});

test("nunca sincronizada ou sincronização antiga gera aviso", () => {
  assert.equal(connectionHealth(conn({ last_synced_at: null }), NOW).level, "warning");
  assert.equal(connectionHealth(conn({ last_synced_at: days(-31) }), NOW).level, "warning");
});

test("indicadores de permissão aceitam os dois nomes de escopo", () => {
  const caps = capabilityStatus(["instagram_basic", "instagram_business_manage_insights"]);
  const byKey = Object.fromEntries(caps.map((c) => [c.key, c.granted]));

  assert.deepEqual(byKey, {
    profile: true,
    insights: true,
    comments: false,
    messages: false,
    publish: false,
  });
});

test("publicação concedida traz aviso de que o Hub não publica", () => {
  const publish = capabilityStatus(["instagram_content_publish"]).find((c) => c.key === "publish");
  assert.equal(publish.granted, true);
  assert.match(publish.note, /não publica/);
});
