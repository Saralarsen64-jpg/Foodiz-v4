SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict HuSIZnwIDDsBtLZXq78U5KXZLfE7byiKnPPseaacHPJatHjyqnvol9ucY8j0deV

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at", "custom_claims_allowlist") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	69cd237d-fe43-4668-8e64-568f0450466b	authenticated	authenticated	market.test@foodiz.co	$2a$10$eBtk6rIX7ZLirCzb1hmcseVjFJU.2KvKNN3S5hIshp9wm1yEVIxj2	2026-05-14 19:49:26.93602+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-14 19:49:26.932884+00	2026-05-14 19:49:26.936711+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	8e63e5d9-2888-490a-b437-5ea6eb98407c	authenticated	authenticated	foodiz-fix-test-1778970762@mailinator.com	$2a$10$klTaV7BfCdSeZFHr5tdtWOOMpb8DQSFq2m6L97fRMSgU01rFtJGF2	\N	\N	cb429beaec3b584fef080cfa8ad579546e4b21d0c2ebd08cb761a886	2026-05-16 22:32:43.716165+00		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"sub": "8e63e5d9-2888-490a-b437-5ea6eb98407c", "email": "foodiz-fix-test-1778970762@mailinator.com", "last_name": "Trigger", "first_name": "Audit", "email_verified": false, "phone_verified": false, "requested_role": "client"}	\N	2026-05-16 22:32:43.543159+00	2026-05-16 22:32:44.462224+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	2858d359-5c9e-443f-9ef9-efd92745d357	authenticated	authenticated	courier.test@foodiz.co	$2a$10$Z5XX/W4suUX2xi3Jc1DOUuxs2rte7qE1B969wDTqTqreCT.UVDyC.	2026-05-14 19:49:58.358904+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-14 19:49:58.355586+00	2026-05-14 19:49:58.359656+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	f4b93c01-ada1-4e31-a10d-efe942f12ee8	authenticated	authenticated	client.test@foodiz.co	$2a$10$s2PMPB5a6Mix25blFT1nj.tn/agUHzNgyZB72R2S7yLJBXyS7ypJu	2026-05-14 19:47:38.544565+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-14 19:47:38.538564+00	2026-05-14 19:47:38.545412+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	b12774bc-b316-44e7-9c04-9faf26ff0088	authenticated	authenticated	restaurant.test@foodiz.co	$2a$10$Xu4U2MDGiA20zS3.1WL4b.oX/LCKNfdta40D9hbq6nDBoBSfetsDm	2026-05-14 19:48:48.675074+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-14 19:48:48.665647+00	2026-05-14 19:48:48.675994+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	authenticated	authenticated	sara.larsen64@gmail.com	$2a$10$cKI8QDlT.yM6jnj/lVpBwOJCzf2r62HZuwKRxklfXGLYvwfrZ3nrK	2026-05-14 12:39:28.774914+00	\N		2026-05-14 12:39:13.752108+00		\N			\N	2026-05-14 14:54:34.478948+00	{"provider": "email", "providers": ["email"]}	{"sub": "444b11a0-30e8-4ee1-ae26-ee98d1f315e3", "email": "sara.larsen64@gmail.com", "phone": "0766570016", "last_name": "Larsen", "first_name": "Sara", "email_verified": true, "phone_verified": false, "requested_role": "client"}	\N	2026-05-14 12:39:13.710706+00	2026-05-14 20:18:02.226696+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	31d602f8-bb4a-45bc-97cc-2836682ecbaa	authenticated	authenticated	admin.test@foodiz.co	$2a$10$UwBn6ItQQGKdOa3qeEbazetuhzBgNZBvSVlCWdAELTy9v.DNY2T0u	2026-05-14 19:50:39.793538+00	\N		\N		\N			\N	2026-05-14 20:18:37.86038+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-05-14 19:50:39.790211+00	2026-05-14 20:18:37.863119+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
8e63e5d9-2888-490a-b437-5ea6eb98407c	8e63e5d9-2888-490a-b437-5ea6eb98407c	{"sub": "8e63e5d9-2888-490a-b437-5ea6eb98407c", "email": "foodiz-fix-test-1778970762@mailinator.com", "last_name": "Trigger", "first_name": "Audit", "email_verified": false, "phone_verified": false, "requested_role": "client"}	email	2026-05-16 22:32:43.700877+00	2026-05-16 22:32:43.70095+00	2026-05-16 22:32:43.70095+00	d66ab256-e20d-4a7a-ac1d-7619bea7506e
444b11a0-30e8-4ee1-ae26-ee98d1f315e3	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	{"sub": "444b11a0-30e8-4ee1-ae26-ee98d1f315e3", "email": "sara.larsen64@gmail.com", "phone": "0766570016", "last_name": "Larsen", "first_name": "Sara", "email_verified": true, "phone_verified": false, "requested_role": "client", "referred_by_code": null}	email	2026-05-14 12:39:13.744149+00	2026-05-14 12:39:13.744204+00	2026-05-14 12:39:13.744204+00	9b0cf3e1-b657-407c-b2ae-ce4c0378fb27
f4b93c01-ada1-4e31-a10d-efe942f12ee8	f4b93c01-ada1-4e31-a10d-efe942f12ee8	{"sub": "f4b93c01-ada1-4e31-a10d-efe942f12ee8", "email": "client.test@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-05-14 19:47:38.543018+00	2026-05-14 19:47:38.543078+00	2026-05-14 19:47:38.543078+00	703ac1e6-66eb-431c-9322-fa86d05b7dc7
b12774bc-b316-44e7-9c04-9faf26ff0088	b12774bc-b316-44e7-9c04-9faf26ff0088	{"sub": "b12774bc-b316-44e7-9c04-9faf26ff0088", "email": "restaurant.test@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-05-14 19:48:48.673171+00	2026-05-14 19:48:48.67322+00	2026-05-14 19:48:48.67322+00	88f10b40-aa15-414e-9055-ef708439671e
69cd237d-fe43-4668-8e64-568f0450466b	69cd237d-fe43-4668-8e64-568f0450466b	{"sub": "69cd237d-fe43-4668-8e64-568f0450466b", "email": "market.test@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-05-14 19:49:26.934668+00	2026-05-14 19:49:26.934716+00	2026-05-14 19:49:26.934716+00	e083ec03-f1b3-418c-aaf3-cee7403a02e1
2858d359-5c9e-443f-9ef9-efd92745d357	2858d359-5c9e-443f-9ef9-efd92745d357	{"sub": "2858d359-5c9e-443f-9ef9-efd92745d357", "email": "courier.test@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-05-14 19:49:58.357341+00	2026-05-14 19:49:58.35739+00	2026-05-14 19:49:58.35739+00	5c21bfff-afe7-4ca8-86bd-b79c7f0a7f5f
31d602f8-bb4a-45bc-97cc-2836682ecbaa	31d602f8-bb4a-45bc-97cc-2836682ecbaa	{"sub": "31d602f8-bb4a-45bc-97cc-2836682ecbaa", "email": "admin.test@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-05-14 19:50:39.791915+00	2026-05-14 19:50:39.791965+00	2026-05-14 19:50:39.791965+00	230bb39f-9231-4d44-b35a-779a7e2747d0
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
3f8a7002-8773-407a-b901-b68b12e4dc8f	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 12:42:32.802321+00	2026-05-14 12:42:32.802321+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
4c88045c-1921-4dfc-873e-cb753ecefd42	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 12:47:18.499112+00	2026-05-14 12:47:18.499112+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
d50e62d5-c97d-4095-80d2-f2a36fe01b50	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:00:45.77947+00	2026-05-14 14:00:45.77947+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
aba213ea-b4eb-4dc2-bc74-94af8f47af14	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:03:40.875218+00	2026-05-14 14:03:40.875218+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
a0f81581-8903-42ab-8965-9c2c413972ae	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:05:15.003883+00	2026-05-14 14:05:15.003883+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
5b5b769b-0393-4fd1-93b6-b799ad536f40	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:19:02.912782+00	2026-05-14 14:19:02.912782+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
0be7ffb4-2255-4951-848a-1bd7aebd54e9	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:23:14.481196+00	2026-05-14 14:23:14.481196+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
3218f34e-a848-4899-ad9f-fa5059ab74fc	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:31:21.484091+00	2026-05-14 14:31:21.484091+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
f4d62b6a-57f9-464b-a55c-a42a94c0833c	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:37:02.909581+00	2026-05-14 14:37:02.909581+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.182.221	\N	\N	\N	\N	\N
b3ecc48e-b387-4a13-8023-d019c615a18e	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 14:54:34.480696+00	2026-05-14 19:34:20.789929+00	\N	aal1	\N	2026-05-14 19:34:20.789775	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	37.165.150.99	\N	\N	\N	\N	\N
9afea418-e338-410b-9b02-318c4c04d3db	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	2026-05-14 12:39:28.794035+00	2026-05-14 20:18:02.238724+00	\N	aal1	\N	2026-05-14 20:18:02.238603	Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1	37.165.150.99	\N	\N	\N	\N	\N
34f71d4f-2c2c-43e1-a863-c237c0ffced5	31d602f8-bb4a-45bc-97cc-2836682ecbaa	2026-05-14 20:18:37.860479+00	2026-05-14 20:18:37.860479+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1	37.165.150.99	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
9afea418-e338-410b-9b02-318c4c04d3db	2026-05-14 12:39:28.811415+00	2026-05-14 12:39:28.811415+00	otp	8cb62b62-0d89-479c-b79f-98f0f7a0add2
3f8a7002-8773-407a-b901-b68b12e4dc8f	2026-05-14 12:42:32.818525+00	2026-05-14 12:42:32.818525+00	password	34519237-6481-4ed9-9069-68258bfda895
4c88045c-1921-4dfc-873e-cb753ecefd42	2026-05-14 12:47:18.513383+00	2026-05-14 12:47:18.513383+00	password	5c7794bc-276c-48ce-9a92-6aab3c8d02cc
d50e62d5-c97d-4095-80d2-f2a36fe01b50	2026-05-14 14:00:45.82656+00	2026-05-14 14:00:45.82656+00	password	f2bee9d2-c1ce-4ed6-b440-0e717024f69d
aba213ea-b4eb-4dc2-bc74-94af8f47af14	2026-05-14 14:03:40.893321+00	2026-05-14 14:03:40.893321+00	password	94b50f90-5870-464c-93a6-0d4084294375
a0f81581-8903-42ab-8965-9c2c413972ae	2026-05-14 14:05:15.008086+00	2026-05-14 14:05:15.008086+00	password	8efb2ce4-41e8-4f9d-a8b0-2f288714a79c
5b5b769b-0393-4fd1-93b6-b799ad536f40	2026-05-14 14:19:02.927537+00	2026-05-14 14:19:02.927537+00	password	c4260f5c-b25f-4159-ab74-cd1a7d83c74e
0be7ffb4-2255-4951-848a-1bd7aebd54e9	2026-05-14 14:23:14.507349+00	2026-05-14 14:23:14.507349+00	password	ee8de4af-06e0-4675-afb6-e8642f756d42
3218f34e-a848-4899-ad9f-fa5059ab74fc	2026-05-14 14:31:21.504086+00	2026-05-14 14:31:21.504086+00	password	9fe5a113-d5c3-4939-a162-d9555c33e766
f4d62b6a-57f9-464b-a55c-a42a94c0833c	2026-05-14 14:37:02.922595+00	2026-05-14 14:37:02.922595+00	password	f74b06d0-4ed3-4e8a-92d5-900e7eba8196
b3ecc48e-b387-4a13-8023-d019c615a18e	2026-05-14 14:54:34.495888+00	2026-05-14 14:54:34.495888+00	password	af42c8f3-2259-4d04-b42b-a8ca34b755a2
34f71d4f-2c2c-43e1-a863-c237c0ffced5	2026-05-14 20:18:37.864971+00	2026-05-14 20:18:37.864971+00	password	d1cf1557-07ce-4a4a-ace6-caa3540d791a
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
a26f784c-645e-4d0a-bc89-a0e482151b72	8e63e5d9-2888-490a-b437-5ea6eb98407c	confirmation_token	cb429beaec3b584fef080cfa8ad579546e4b21d0c2ebd08cb761a886	foodiz-fix-test-1778970762@mailinator.com	2026-05-16 22:32:44.476174	2026-05-16 22:32:44.476174
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	12	yyjgkunzihwg	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 12:42:32.813396+00	2026-05-14 12:42:32.813396+00	\N	3f8a7002-8773-407a-b901-b68b12e4dc8f
00000000-0000-0000-0000-000000000000	13	x27ab6pmhjii	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 12:47:18.508421+00	2026-05-14 12:47:18.508421+00	\N	4c88045c-1921-4dfc-873e-cb753ecefd42
00000000-0000-0000-0000-000000000000	14	uxgfblrwsxrs	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:00:45.800849+00	2026-05-14 14:00:45.800849+00	\N	d50e62d5-c97d-4095-80d2-f2a36fe01b50
00000000-0000-0000-0000-000000000000	15	cdu6s5gzbmr6	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:03:40.885817+00	2026-05-14 14:03:40.885817+00	\N	aba213ea-b4eb-4dc2-bc74-94af8f47af14
00000000-0000-0000-0000-000000000000	16	cdzmr3faaxtp	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:05:15.005701+00	2026-05-14 14:05:15.005701+00	\N	a0f81581-8903-42ab-8965-9c2c413972ae
00000000-0000-0000-0000-000000000000	17	zhlcm3gdozqh	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:19:02.923518+00	2026-05-14 14:19:02.923518+00	\N	5b5b769b-0393-4fd1-93b6-b799ad536f40
00000000-0000-0000-0000-000000000000	18	ih5zt27pfrwn	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:23:14.501679+00	2026-05-14 14:23:14.501679+00	\N	0be7ffb4-2255-4951-848a-1bd7aebd54e9
00000000-0000-0000-0000-000000000000	19	yimunzxbc2vd	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:31:21.498418+00	2026-05-14 14:31:21.498418+00	\N	3218f34e-a848-4899-ad9f-fa5059ab74fc
00000000-0000-0000-0000-000000000000	20	os26f57xdgua	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 14:37:02.919705+00	2026-05-14 14:37:02.919705+00	\N	f4d62b6a-57f9-464b-a55c-a42a94c0833c
00000000-0000-0000-0000-000000000000	21	opwopf4mwru4	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	t	2026-05-14 14:54:34.491682+00	2026-05-14 17:17:27.187219+00	\N	b3ecc48e-b387-4a13-8023-d019c615a18e
00000000-0000-0000-0000-000000000000	11	oiwvtxpgpqg5	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	t	2026-05-14 12:39:28.801486+00	2026-05-14 17:41:03.882262+00	\N	9afea418-e338-410b-9b02-318c4c04d3db
00000000-0000-0000-0000-000000000000	23	w6d4xxey2zi6	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	t	2026-05-14 17:41:03.887418+00	2026-05-14 18:42:00.523706+00	oiwvtxpgpqg5	9afea418-e338-410b-9b02-318c4c04d3db
00000000-0000-0000-0000-000000000000	22	yqfryowbb57x	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	t	2026-05-14 17:17:27.199943+00	2026-05-14 19:34:20.766979+00	opwopf4mwru4	b3ecc48e-b387-4a13-8023-d019c615a18e
00000000-0000-0000-0000-000000000000	26	kzdo7ec2wnod	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 19:34:20.774975+00	2026-05-14 19:34:20.774975+00	yqfryowbb57x	b3ecc48e-b387-4a13-8023-d019c615a18e
00000000-0000-0000-0000-000000000000	24	hh6zukjtpslu	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	t	2026-05-14 18:42:00.539493+00	2026-05-14 20:18:02.214089+00	w6d4xxey2zi6	9afea418-e338-410b-9b02-318c4c04d3db
00000000-0000-0000-0000-000000000000	28	xcnp2fop7o4i	444b11a0-30e8-4ee1-ae26-ee98d1f315e3	f	2026-05-14 20:18:02.22198+00	2026-05-14 20:18:02.22198+00	hh6zukjtpslu	9afea418-e338-410b-9b02-318c4c04d3db
00000000-0000-0000-0000-000000000000	29	yhhnwih2465x	31d602f8-bb4a-45bc-97cc-2836682ecbaa	f	2026-05-14 20:18:37.861997+00	2026-05-14 20:18:37.861997+00	\N	34f71d4f-2c2c-43e1-a863-c237c0ffced5
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("user_id", "role", "account_status", "email", "first_name", "last_name", "phone", "referral_code", "referred_by_user_id", "created_at", "updated_at", "deleted_at") FROM stdin;
444b11a0-30e8-4ee1-ae26-ee98d1f315e3	client	active	sara.larsen64@gmail.com	Sara	Larsen	0766570016	fdz-444b11a0-30e8	\N	2026-05-14 12:39:13.706847+00	2026-05-14 12:39:13.706847+00	\N
f4b93c01-ada1-4e31-a10d-efe942f12ee8	client	active	client.test@foodiz.co	Lina	Martin	0600000000	fdz-f4b93c01-ada1	\N	2026-05-14 19:47:38.538257+00	2026-05-16 15:50:01.099386+00	\N
b12774bc-b316-44e7-9c04-9faf26ff0088	partner	active	restaurant.test@foodiz.co	Marc	Durand	0611111111	fdz-b12774bc-b316	\N	2026-05-14 19:48:48.665301+00	2026-05-16 15:50:01.099386+00	\N
69cd237d-fe43-4668-8e64-568f0450466b	partner	active	market.test@foodiz.co	Claire	Bordelaise	0622222222	fdz-69cd237d-fe43	\N	2026-05-14 19:49:26.932559+00	2026-05-16 15:50:01.099386+00	\N
2858d359-5c9e-443f-9ef9-efd92745d357	courier	active	courier.test@foodiz.co	Yanis	Express	0633333333	fdz-2858d359-5c9e	\N	2026-05-14 19:49:58.355246+00	2026-05-16 15:50:01.099386+00	\N
31d602f8-bb4a-45bc-97cc-2836682ecbaa	admin	active	admin.test@foodiz.co	Admin	Foodiz	0644444444	fdz-31d602f8-bb4a	\N	2026-05-14 19:50:39.789888+00	2026-05-16 15:50:01.099386+00	\N
8e63e5d9-2888-490a-b437-5ea6eb98407c	client	active	foodiz-fix-test-1778970762@mailinator.com	Audit	Trigger	\N	fdz-8e63e5d9-2888	\N	2026-05-16 22:32:43.535128+00	2026-05-16 22:32:43.535128+00	\N
\.


--
-- Data for Name: account_suspensions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."account_suspensions" ("id", "user_id", "reason", "imposed_by_admin_user_id", "starts_at", "ends_at", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: admin_action_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."admin_action_logs" ("id", "admin_user_id", "action_type", "target_table", "target_id", "payload", "created_at") FROM stdin;
\.


--
-- Data for Name: client_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_addresses" ("id", "client_user_id", "label", "address_line_1", "address_line_2", "postal_code", "city", "country_code", "latitude", "longitude", "is_default", "created_at", "updated_at") FROM stdin;
bc847623-db4e-4c14-9843-b750fd42e5d9	f4b93c01-ada1-4e31-a10d-efe942f12ee8	Maison	12 Rue Sainte-Catherine	\N	33000	Bordeaux	FR	44.837800	-0.579200	t	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00
\.


--
-- Data for Name: partners; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partners" ("id", "user_id", "establishment_type", "legal_name", "display_name", "description", "logo_url", "cover_image_url", "opening_hours", "minimum_order_cents", "is_halal", "siret", "address_line_1", "address_line_2", "postal_code", "city", "country_code", "latitude", "longitude", "validation_status", "submitted_at", "reviewed_at", "reviewed_by_admin_user_id", "rc_pro_due_at", "rc_pro_received_at", "created_at", "updated_at") FROM stdin;
fba797a9-1eb5-45d2-9b40-5687c276f9f6	b12774bc-b316-44e7-9c04-9faf26ff0088	restaurant	Maison du Goût Bordeaux	Maison du Goût	Une table bordelaise premium entre cuisine généreuse, plats signatures et ambiance chaleureuse.	https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80	https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80	{"friday": "12:00-14:30,19:00-23:00", "monday": "12:00-14:30,19:00-22:30", "sunday": "12:00-15:00,19:00-22:00", "tuesday": "12:00-14:30,19:00-22:30", "saturday": "12:00-15:00,19:00-23:00", "thursday": "12:00-14:30,19:00-22:30", "wednesday": "12:00-14:30,19:00-22:30"}	2000	f	11111111111111	18 Quai Richelieu	\N	33000	Bordeaux	FR	44.840200	-0.568100	approved	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00	\N	2026-06-15 15:50:01.099386+00	\N	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00
8fac5940-04ce-43d0-80d3-8b566bb3be69	69cd237d-fe43-4668-8e64-568f0450466b	market	Maison Foodiz Bordeaux	Maison Foodiz	Une épicerie premium locale à Bordeaux, pensée pour les envies du quotidien et les plaisirs gourmands.	https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80	https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80	{"friday": "08:00-22:00", "monday": "08:00-21:00", "sunday": "09:00-20:00", "tuesday": "08:00-21:00", "saturday": "09:00-22:00", "thursday": "08:00-21:00", "wednesday": "08:00-21:00"}	1500	f	12345678901234	25 Cours Victor Hugo	\N	33000	Bordeaux	FR	44.835700	-0.571600	approved	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00	\N	2026-06-15 15:50:01.099386+00	\N	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."carts" ("id", "client_user_id", "partner_id", "delivery_address_id", "status", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."categories" ("id", "establishment_type", "name", "is_active", "sort_order", "created_at", "updated_at") FROM stdin;
e29baf15-2b66-4722-94c9-ce14bde18967	restaurant	Signature	t	1	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
ba8a7d2c-28e9-40e7-b404-1cbf65be3cfa	restaurant	Burgers	t	2	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
802f7002-9a49-4a87-8613-e735c359bf56	restaurant	Pizzas	t	3	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
3602f962-00c5-49a3-b092-a8d9aeb3a6c6	restaurant	Gourmandises	t	4	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
8fd15c8f-90d0-422f-bd45-633bb6865cf8	market	Épicerie	t	1	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
1552d825-70a2-412b-93d3-dcb7efa38005	market	Boissons	t	2	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
7a0764f0-60df-4fa9-8a4b-8ceff89ad3f3	market	Gourmandises	t	3	2026-05-16 15:58:28.674831+00	2026-05-16 15:58:28.674831+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."products" ("id", "partner_id", "category_id", "name", "description", "image_url", "partner_price_cents", "is_halal", "is_bestseller", "sort_order", "status", "is_available", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."cart_items" ("id", "cart_id", "product_id", "quantity", "unit_partner_price_cents", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: couriers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."couriers" ("id", "user_id", "validation_status", "submitted_at", "reviewed_at", "reviewed_by_admin_user_id", "created_at", "updated_at") FROM stdin;
a2491e4c-15db-473b-a9fc-414607cafe40	2858d359-5c9e-443f-9ef9-efd92745d357	approved	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00	\N	2026-05-16 15:50:01.099386+00	2026-05-16 15:50:01.099386+00
\.


--
-- Data for Name: courier_availabilities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_availabilities" ("id", "courier_id", "starts_at", "ends_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: courier_payouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_payouts" ("id", "courier_id", "amount_cents", "period_start", "period_end", "status", "external_reference", "processed_by_admin_user_id", "processed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: delivery_zones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."delivery_zones" ("id", "name", "city", "geojson", "pricing_mode", "min_distance_km", "max_distance_km", "base_fee_cents", "minimum_fee_cents", "per_km_cents", "is_default", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."orders" ("id", "client_user_id", "partner_id", "delivery_address_id", "delivery_address_line_1", "delivery_address_line_2", "delivery_postal_code", "delivery_city", "delivery_country_code", "delivery_latitude", "delivery_longitude", "cart_id", "delivery_zone_id", "order_status", "item_count", "subtotal_partner_cents", "subtotal_customer_cents", "total_markup_cents", "courier_share_cents", "foodiz_share_cents", "loyalty_funding_cents", "referral_funding_cents", "service_fee_cents", "delivery_fee_cents", "total_customer_cents", "distance_km", "placed_at", "paid_at", "delivered_at", "cancelled_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: courier_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_reviews" ("id", "order_id", "client_user_id", "courier_id", "rating", "comment", "created_at") FROM stdin;
\.


--
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."deliveries" ("id", "order_id", "courier_id", "status", "accepted_at", "pickup_confirmed_at", "delivered_at", "client_confirmed_at", "proof_image_url", "delivery_notes", "last_courier_lat", "last_courier_lng", "last_location_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: domain_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."domain_events" ("id", "event_name", "aggregate_type", "aggregate_id", "source", "idempotency_key", "payload", "emitted_at", "processed_at") FROM stdin;
\.


--
-- Data for Name: loyalty_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."loyalty_accounts" ("client_user_id", "points_balance", "total_points_earned", "created_at", "updated_at") FROM stdin;
444b11a0-30e8-4ee1-ae26-ee98d1f315e3	0	0	2026-05-14 12:39:13.706847+00	2026-05-14 12:39:13.706847+00
b12774bc-b316-44e7-9c04-9faf26ff0088	0	0	2026-05-14 19:48:48.665301+00	2026-05-14 19:48:48.665301+00
69cd237d-fe43-4668-8e64-568f0450466b	0	0	2026-05-14 19:49:26.932559+00	2026-05-14 19:49:26.932559+00
2858d359-5c9e-443f-9ef9-efd92745d357	0	0	2026-05-14 19:49:58.355246+00	2026-05-14 19:49:58.355246+00
31d602f8-bb4a-45bc-97cc-2836682ecbaa	0	0	2026-05-14 19:50:39.789888+00	2026-05-14 19:50:39.789888+00
f4b93c01-ada1-4e31-a10d-efe942f12ee8	25	25	2026-05-14 19:47:38.538257+00	2026-05-16 15:50:01.099386+00
8e63e5d9-2888-490a-b437-5ea6eb98407c	0	0	2026-05-16 22:32:43.535128+00	2026-05-16 22:32:43.535128+00
\.


--
-- Data for Name: partner_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_reviews" ("id", "order_id", "client_user_id", "partner_id", "rating", "comment", "created_at") FROM stdin;
\.


--
-- Data for Name: satisfaction_responses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."satisfaction_responses" ("id", "order_id", "client_user_id", "response_payload", "created_at") FROM stdin;
\.


--
-- Data for Name: loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."loyalty_transactions" ("id", "client_user_id", "source", "order_id", "partner_review_id", "courier_review_id", "satisfaction_response_id", "points", "created_at") FROM stdin;
\.


--
-- Data for Name: notification_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notification_devices" ("id", "user_id", "platform", "push_token", "is_active", "last_seen_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: partner_notification_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_notification_campaigns" ("id", "partner_id", "status", "generated_content", "tone_locked", "credits_consumed", "ai_score", "gourmandise_score", "elegance_score", "clarity_score", "soft_conversion_score", "context_relevance_score", "brand_safety_score", "ai_score_details", "sent_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: notification_dispatches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notification_dispatches" ("id", "recipient_user_id", "message_type", "campaign_id", "device_id", "message_body", "status", "provider_message_id", "error_message", "dispatched_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_items" ("id", "order_id", "product_id", "product_name_snapshot", "quantity", "markup_bracket", "unit_partner_price_cents", "unit_markup_cents", "unit_customer_price_cents", "unit_courier_share_cents", "unit_foodiz_share_cents", "unit_loyalty_funding_cents", "unit_referral_funding_cents", "line_partner_subtotal_cents", "line_customer_subtotal_cents", "created_at") FROM stdin;
\.


--
-- Data for Name: order_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_payments" ("id", "order_id", "stripe_payment_intent_id", "amount_cents", "currency_code", "status", "paid_at", "failed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: partner_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_documents" ("id", "partner_id", "document_type", "storage_path", "verification_status", "submitted_at", "reviewed_at", "reviewed_by_admin_user_id", "rejection_reason", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: partner_notification_pack_purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_notification_pack_purchases" ("id", "partner_id", "pack_type", "campaigns_included", "amount_cents", "stripe_payment_intent_id", "payment_status", "purchased_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: partner_notification_credit_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_notification_credit_ledger" ("id", "partner_id", "source_type", "pack_purchase_id", "campaign_id", "delta_credits", "balance_after", "created_at") FROM stdin;
\.


--
-- Data for Name: partner_payouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_payouts" ("id", "partner_id", "amount_cents", "period_start", "period_end", "status", "external_reference", "processed_by_admin_user_id", "processed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."referrals" ("id", "referrer_user_id", "referred_user_id", "status", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
partner-documents-private	partner-documents-private	\N	2026-05-08 21:59:11.59053+00	2026-05-08 21:59:11.59053+00	f	f	\N	\N	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 29, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict HuSIZnwIDDsBtLZXq78U5KXZLfE7byiKnPPseaacHPJatHjyqnvol9ucY8j0deV

RESET ALL;
