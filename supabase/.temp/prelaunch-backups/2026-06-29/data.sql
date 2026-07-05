SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict joW5cMdgMoXGrOtVX0t2FqGfkXwR2mI1ZqIO5neq41mIXv4mboTdsXSZTFeZe3J

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

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at") FROM stdin;
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
00000000-0000-0000-0000-000000000000	2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	authenticated	authenticated	lolitagmnz@gmail.com	$2a$10$ebNFsKoRuzQgql4uKDLWd.qKVr93yluFDkieXnz46bwBmdEZtn/3W	2026-06-21 16:49:37.211207+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"city": "Mont-de-Marsan", "role": "courier", "phone": "+33746139238", "siret": "89110571000018", "full_name": "Lolita Gimenez", "last_name": "Gimenez", "prelaunch": true, "first_name": "Lolita", "cgu_accepted": true, "email_verified": true}	\N	2026-06-21 16:49:37.105423+00	2026-06-21 16:49:37.227682+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	2567b3df-b07a-47e6-843a-d1c829f97679	authenticated	authenticated	boost.btb64@gmail.com	$2a$10$4LwzfZQ547F0s3fqvWqk4erjhBA5.JaaklMr9yD04Wfk/ED9Dn0DK	2026-06-15 16:18:28.799043+00	\N		2026-06-15 16:18:06.200744+00		\N			\N	2026-06-15 16:18:28.808033+00	{"provider": "email", "providers": ["email"]}	{"sub": "2567b3df-b07a-47e6-843a-d1c829f97679", "city": "Mont de marsan", "role": "courier", "email": "boost.btb64@gmail.com", "phone": "0766570016", "address": "9 rue gambetta", "full_name": "Ella Test", "last_name": "Test", "first_name": "Ella", "postal_code": "40000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	\N	2026-06-15 16:18:06.033042+00	2026-06-15 16:18:28.850779+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	023e8b67-1db9-4697-b9bd-0c6a1ad1310a	authenticated	authenticated	guilleraultjason@gmail.com	$2a$10$DFFsotQfwEiJwqzWjw1Sve1/Eq30un.OEceAdTiTrIyhN9M9kR0ZK	2026-06-21 17:48:40.022676+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"city": "Mont de marsan", "role": "client", "phone": "+33652855106", "full_name": "jason guillerault", "last_name": "guillerault", "prelaunch": true, "first_name": "jason", "cgu_accepted": true, "email_verified": true}	\N	2026-06-21 17:48:39.990184+00	2026-06-21 17:48:40.02535+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	59e33504-2910-4ac7-93b1-351a65db7840	authenticated	authenticated	celiaelbenhali@gmail.com	$2a$10$2MkAGooeu3bKorSBgicO/e047lS1bmwzkCd4XEnAr4gzOi8fAS26K	2026-06-05 13:11:58.323572+00	\N		2026-06-05 13:09:34.507978+00		\N			\N	2026-06-14 18:55:06.859464+00	{"provider": "email", "providers": ["email"]}	{"sub": "59e33504-2910-4ac7-93b1-351a65db7840", "city": "Pau", "role": "client", "email": "celiaelbenhali@gmail.com", "phone": "0754342128", "address": "5 rue du soust ", "last_name": "mia", "first_name": "soleil", "postal_code": "64000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	\N	2026-06-05 13:09:34.457516+00	2026-06-14 20:51:49.857533+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	a687bafc-e7de-4c72-ae1f-d44ed6db6d15	authenticated	authenticated	lina.bacchieri4@gmail.com	$2a$10$Af9HxhcnMDsMEeH1cuKeeOSgOKA3o7ir0eUsfYyBIKuuzgHR.zIvi	\N	\N	edb229377f043b72537477210e07efad5e3dcaf12a44ab02bed84016	2026-06-15 08:44:13.073754+00		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"sub": "a687bafc-e7de-4c72-ae1f-d44ed6db6d15", "city": "Paris", "role": "client", "email": "lina.bacchieri4@gmail.com", "phone": "0782041611", "address": "2 Rue des Lyonnais, 75005 Paris, France", "full_name": "Lina BACCHIERI", "last_name": "BACCHIERI", "first_name": "Lina", "postal_code": "75005", "cgu_accepted": true, "email_verified": false, "phone_verified": false}	\N	2026-06-15 08:44:12.971785+00	2026-06-15 08:44:14.484154+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	bdb54773-79e1-4e3f-a7a2-aa98994c4023	authenticated	authenticated	silas.davidkelya40@gmail.com	$2a$10$84MkNqY0tDckLPxN/YbH4upVFS6v3Bf2mSpzCNSZd4.TSU2fuD7iW	2026-06-21 16:51:53.603182+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"city": "40280", "role": "client", "phone": "+33745095302", "full_name": "Kelya Navarlas", "last_name": "Navarlas", "prelaunch": true, "first_name": "Kelya", "cgu_accepted": true, "email_verified": true}	\N	2026-06-21 16:51:53.572281+00	2026-06-21 16:51:53.606228+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	703c689e-9e29-4dd0-b660-61542f248bcc	authenticated	authenticated	sourislarsen@gmail.com	$2a$10$nfGim9fQ3/OuXrsEf98coOPBwIxJKGnbRCQP5sNaEIDCFDJcS55Zu	2026-06-05 09:14:12.223567+00	\N		\N		\N			\N	2026-06-05 09:14:12.234709+00	{"provider": "email", "providers": ["email"]}	{"sub": "703c689e-9e29-4dd0-b660-61542f248bcc", "city": "Mont de marsan", "role": "client", "email": "sourislarsen@gmail.com", "phone": "0774597924", "address": "7 RUE MAUBEC ", "last_name": "banini", "first_name": "lia", "postal_code": "40000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	\N	2026-06-05 09:14:12.158979+00	2026-06-05 09:14:12.263897+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	01ebaf96-71b4-4153-8644-76c5bdeaa4ef	authenticated	authenticated	codex-foodiz-1782019925@example.com	$2a$10$SzvlrCN3F0YzrVUoRljPM.7WLl27kD2CPU0Nw9Ik0kiWiSIkDe7rO	2026-06-21 05:32:06.215382+00	\N		\N		\N			\N	2026-06-21 05:32:06.526202+00	{"provider": "email", "providers": ["email"]}	{"role": "client", "full_name": "Test Foodiz", "last_name": "Foodiz", "first_name": "Test", "cgu_accepted": true, "email_verified": true}	\N	2026-06-21 05:32:06.143377+00	2026-06-21 05:32:06.560045+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	2a93f525-da9e-4d6a-a7b5-c50027e45d01	authenticated	authenticated	sara.larsen64@gmail.com	$2a$10$CkhjiHpsy3HEtvCfHzMIheyQykI7o7CBArlttCOR0VMHRXmLqS9bi	2026-06-03 15:01:37.668254+00	\N		\N		\N			\N	2026-06-03 15:01:37.674136+00	{"provider": "email", "providers": ["email"]}	{"sub": "2a93f525-da9e-4d6a-a7b5-c50027e45d01", "city": "Mont-de-marsan", "role": "client", "email": "sara.larsen64@gmail.com", "phone": "0611923107", "address": "9 rue maubec", "last_name": "Larsen", "first_name": "Sara", "postal_code": "40000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	\N	2026-06-03 15:01:37.633461+00	2026-06-03 15:01:37.679661+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	authenticated	authenticated	lrsn.saraa@gmail.com	$2a$10$JmcBM97aDzSy4XgiVbtuP.I7G4n7DoX4UhCkGTC5roQDmMNl13O.q	2026-06-05 09:31:34.543087+00	\N		\N		\N			\N	2026-06-05 09:31:34.547394+00	{"provider": "email", "providers": ["email"]}	{"sub": "4d54499c-88c0-434f-a5cd-5e9e498d5bbe", "city": "Mont de marsan", "role": "client", "email": "lrsn.saraa@gmail.com", "phone": "0799887898", "address": "5 RUE MAUBEC ", "last_name": "banini", "first_name": "lou", "postal_code": "40000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	\N	2026-06-05 09:31:34.526471+00	2026-06-05 09:31:34.55634+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	a9f12d5d-0efe-48ce-be86-40ed30337182	authenticated	authenticated	lolimanel40@gmail.com	$2a$10$bN55wLUTilccLVJ5Moxv/.OialvO8MCbzOgVkpR0V7dP4I6g7ttca	2026-06-22 09:50:45.871576+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"city": "Mont De Marsan", "role": "courier", "phone": "+33784662424", "siret": "83096525700025", "full_name": "Lolita Gimenez", "last_name": "Gimenez", "prelaunch": true, "first_name": "Lolita", "cgu_accepted": true, "email_verified": true}	\N	2026-06-22 09:50:45.745513+00	2026-06-22 09:50:45.894931+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	fc0dcab4-4965-45c8-b78d-ae2211c7e160	authenticated	authenticated	admin@foodiz.co	$2a$10$XiOMTU9n2tGiq1jJgwQHyOmPRzHeZV0oNGuwOHDxHY3yqlpKqbY4y	2026-06-03 12:58:53.807827+00	\N		\N		\N			\N	2026-06-27 19:11:25.58689+00	{"provider": "email", "providers": ["email"]}	{"email_verified": true}	\N	2026-06-03 12:58:53.771206+00	2026-06-27 19:11:25.618099+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	55d4f8be-86fd-4145-85f8-ab8756ca7f31	authenticated	authenticated	hexa.bat.landes@gmail.com	$2a$10$olt5uoEPaYDsHDXv4AFZ/umlSmCT.0N5NUSpUvwnizJwrIQNMpbIy	2026-06-05 10:00:11.436402+00	\N		\N		\N			\N	2026-06-05 10:00:11.442431+00	{"provider": "email", "providers": ["email"]}	{"sub": "55d4f8be-86fd-4145-85f8-ab8756ca7f31", "city": "Mont de marsan ", "role": "client", "email": "hexa.bat.landes@gmail.com", "phone": "0665454432", "address": "3 rue gambetta", "last_name": "nouaille", "first_name": "bastien", "postal_code": "40000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	\N	2026-06-05 10:00:11.39584+00	2026-06-05 10:00:11.451087+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	54e36590-a77d-4ad6-a86e-d18202c47577	authenticated	authenticated	contact@foodiz.co	$2a$10$FtxXBqvGrWHaXLaAK7xf/eLPYixvB7Xs.XlPi8PrER8RtI6KcZYXa	\N	\N	49619157addb78658b5944bf32ef17e6bdb829d86b31095e9e7b7cb3	2026-06-06 15:19:49.94075+00		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"sub": "54e36590-a77d-4ad6-a86e-d18202c47577", "email": "contact@foodiz.co", "email_verified": false, "phone_verified": false}	\N	2026-06-06 15:19:44.497255+00	2026-06-06 15:19:51.085159+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
59e33504-2910-4ac7-93b1-351a65db7840	59e33504-2910-4ac7-93b1-351a65db7840	{"ref": null, "sub": "59e33504-2910-4ac7-93b1-351a65db7840", "city": "Pau", "role": "client", "email": "celiaelbenhali@gmail.com", "phone": "0754342128", "siret": null, "address": "5 rue du soust ", "last_name": "mia", "first_name": "soleil", "postal_code": "64000", "cgu_accepted": true, "email_verified": true, "phone_verified": false}	email	2026-06-05 13:09:34.503603+00	2026-06-05 13:09:34.503663+00	2026-06-05 13:09:34.503663+00	1f30247c-e594-4cb0-8cd3-241283a7a582
fc0dcab4-4965-45c8-b78d-ae2211c7e160	fc0dcab4-4965-45c8-b78d-ae2211c7e160	{"sub": "fc0dcab4-4965-45c8-b78d-ae2211c7e160", "email": "admin@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-06-03 12:58:53.804497+00	2026-06-03 12:58:53.80455+00	2026-06-03 12:58:53.80455+00	e20510a2-2a6c-42e1-8dff-564be9475b98
2a93f525-da9e-4d6a-a7b5-c50027e45d01	2a93f525-da9e-4d6a-a7b5-c50027e45d01	{"ref": null, "sub": "2a93f525-da9e-4d6a-a7b5-c50027e45d01", "city": "Mont-de-marsan", "role": "client", "email": "sara.larsen64@gmail.com", "phone": "0611923107", "siret": null, "address": "9 rue maubec", "last_name": "Larsen", "first_name": "Sara", "postal_code": "40000", "cgu_accepted": true, "email_verified": false, "phone_verified": false}	email	2026-06-03 15:01:37.6646+00	2026-06-03 15:01:37.664647+00	2026-06-03 15:01:37.664647+00	f35db124-0ef0-4cf0-bae6-d987017cb970
703c689e-9e29-4dd0-b660-61542f248bcc	703c689e-9e29-4dd0-b660-61542f248bcc	{"ref": null, "sub": "703c689e-9e29-4dd0-b660-61542f248bcc", "city": "Mont de marsan", "role": "client", "email": "sourislarsen@gmail.com", "phone": "0774597924", "siret": null, "address": "7 RUE MAUBEC ", "last_name": "banini", "first_name": "lia", "postal_code": "40000", "cgu_accepted": true, "email_verified": false, "phone_verified": false}	email	2026-06-05 09:14:12.21374+00	2026-06-05 09:14:12.213791+00	2026-06-05 09:14:12.213791+00	431b0f25-9daa-40c9-8729-d89955641999
4d54499c-88c0-434f-a5cd-5e9e498d5bbe	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	{"ref": null, "sub": "4d54499c-88c0-434f-a5cd-5e9e498d5bbe", "city": "Mont de marsan", "role": "client", "email": "lrsn.saraa@gmail.com", "phone": "0799887898", "siret": null, "address": "5 RUE MAUBEC ", "last_name": "banini", "first_name": "lou", "postal_code": "40000", "cgu_accepted": true, "email_verified": false, "phone_verified": false}	email	2026-06-05 09:31:34.537451+00	2026-06-05 09:31:34.537498+00	2026-06-05 09:31:34.537498+00	763166b2-aaf2-4018-856a-2981b66befbf
55d4f8be-86fd-4145-85f8-ab8756ca7f31	55d4f8be-86fd-4145-85f8-ab8756ca7f31	{"ref": null, "sub": "55d4f8be-86fd-4145-85f8-ab8756ca7f31", "city": "Mont de marsan ", "role": "client", "email": "hexa.bat.landes@gmail.com", "phone": "0665454432", "siret": null, "address": "3 rue gambetta", "last_name": "nouaille", "first_name": "bastien", "postal_code": "40000", "cgu_accepted": true, "email_verified": false, "phone_verified": false}	email	2026-06-05 10:00:11.432948+00	2026-06-05 10:00:11.433005+00	2026-06-05 10:00:11.433005+00	4c0b6f88-5ff0-4a31-a261-2bece84bf303
54e36590-a77d-4ad6-a86e-d18202c47577	54e36590-a77d-4ad6-a86e-d18202c47577	{"sub": "54e36590-a77d-4ad6-a86e-d18202c47577", "email": "contact@foodiz.co", "email_verified": false, "phone_verified": false}	email	2026-06-06 15:19:44.526992+00	2026-06-06 15:19:44.527038+00	2026-06-06 15:19:44.527038+00	09c755db-1fb4-471e-b8f6-37bce595f2ab
a687bafc-e7de-4c72-ae1f-d44ed6db6d15	a687bafc-e7de-4c72-ae1f-d44ed6db6d15	{"sub": "a687bafc-e7de-4c72-ae1f-d44ed6db6d15", "city": "Paris", "role": "client", "email": "lina.bacchieri4@gmail.com", "phone": "0782041611", "siret": null, "address": "2 Rue des Lyonnais, 75005 Paris, France", "ref_code": null, "full_name": "Lina BACCHIERI", "last_name": "BACCHIERI", "first_name": "Lina", "postal_code": "75005", "cgu_accepted": true, "business_name": null, "email_verified": false, "phone_verified": false}	email	2026-06-15 08:44:13.056359+00	2026-06-15 08:44:13.05644+00	2026-06-15 08:44:13.05644+00	6e9cb5b9-97e2-4212-95c2-4e95657ee7f2
2567b3df-b07a-47e6-843a-d1c829f97679	2567b3df-b07a-47e6-843a-d1c829f97679	{"sub": "2567b3df-b07a-47e6-843a-d1c829f97679", "city": "Mont de marsan", "role": "courier", "email": "boost.btb64@gmail.com", "phone": "0766570016", "siret": null, "address": "9 rue gambetta", "ref_code": null, "full_name": "Ella Test", "last_name": "Test", "first_name": "Ella", "postal_code": "40000", "cgu_accepted": true, "business_name": null, "email_verified": true, "phone_verified": false}	email	2026-06-15 16:18:06.188307+00	2026-06-15 16:18:06.188357+00	2026-06-15 16:18:06.188357+00	7b870460-d4e5-43a3-a892-94d3591bf6e5
01ebaf96-71b4-4153-8644-76c5bdeaa4ef	01ebaf96-71b4-4153-8644-76c5bdeaa4ef	{"sub": "01ebaf96-71b4-4153-8644-76c5bdeaa4ef", "email": "codex-foodiz-1782019925@example.com", "email_verified": false, "phone_verified": false}	email	2026-06-21 05:32:06.202933+00	2026-06-21 05:32:06.20632+00	2026-06-21 05:32:06.20632+00	f845011b-dc56-4fab-bb3f-37d5e20bb19d
2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	{"sub": "2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08", "email": "lolitagmnz@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-21 16:49:37.196769+00	2026-06-21 16:49:37.196827+00	2026-06-21 16:49:37.196827+00	42844655-74b2-4932-9225-8cc1a160accd
bdb54773-79e1-4e3f-a7a2-aa98994c4023	bdb54773-79e1-4e3f-a7a2-aa98994c4023	{"sub": "bdb54773-79e1-4e3f-a7a2-aa98994c4023", "email": "silas.davidkelya40@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-21 16:51:53.600885+00	2026-06-21 16:51:53.600945+00	2026-06-21 16:51:53.600945+00	d3195b8b-cbd0-4b66-b3ea-487223ca5038
023e8b67-1db9-4697-b9bd-0c6a1ad1310a	023e8b67-1db9-4697-b9bd-0c6a1ad1310a	{"sub": "023e8b67-1db9-4697-b9bd-0c6a1ad1310a", "email": "guilleraultjason@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-21 17:48:40.020113+00	2026-06-21 17:48:40.020171+00	2026-06-21 17:48:40.020171+00	114c3554-0006-480c-a863-46984bcd6996
a9f12d5d-0efe-48ce-be86-40ed30337182	a9f12d5d-0efe-48ce-be86-40ed30337182	{"sub": "a9f12d5d-0efe-48ce-be86-40ed30337182", "email": "lolimanel40@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-22 09:50:45.857849+00	2026-06-22 09:50:45.857904+00	2026-06-22 09:50:45.857904+00	968c02e4-ecaa-43c8-b7df-f5f31793bad9
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
1e54033f-8833-47c1-bfa5-e56b6e2eb11e	2567b3df-b07a-47e6-843a-d1c829f97679	2026-06-15 16:18:28.809344+00	2026-06-15 16:18:28.809344+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 26_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/149.0.7827.137 Mobile/15E148 Safari/604.1	185.3.197.162	\N	\N	\N	\N	\N
e755e24c-4408-479d-95b2-7234f187e093	01ebaf96-71b4-4153-8644-76c5bdeaa4ef	2026-06-21 05:32:06.527586+00	2026-06-21 05:32:06.527586+00	\N	aal1	\N	\N	node	185.3.197.162	\N	\N	\N	\N	\N
aba5e26b-512a-4dfc-b893-dd51c73ebf86	fc0dcab4-4965-45c8-b78d-ae2211c7e160	2026-06-25 07:26:20.91663+00	2026-06-27 19:09:35.165097+00	\N	aal1	\N	2026-06-27 19:09:35.164986	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1	80.215.130.11	\N	\N	\N	\N	\N
fda1d799-fbd5-408e-9c13-cbd3d425f751	fc0dcab4-4965-45c8-b78d-ae2211c7e160	2026-06-27 19:11:25.588594+00	2026-06-27 19:11:25.588594+00	\N	aal1	\N	\N	Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1	80.215.130.11	\N	\N	\N	\N	\N
cac57858-1fa7-4dc6-9839-86e838128e72	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	2026-06-05 09:31:34.549003+00	2026-06-05 09:31:34.549003+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	185.3.197.162	\N	\N	\N	\N	\N
7fe346d2-e950-4126-be07-b8dde84a2f33	55d4f8be-86fd-4145-85f8-ab8756ca7f31	2026-06-05 10:00:11.443545+00	2026-06-05 10:00:11.443545+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	185.3.197.162	\N	\N	\N	\N	\N
c72bee07-5293-4d48-87a3-15af69ce5ec4	59e33504-2910-4ac7-93b1-351a65db7840	2026-06-12 11:59:51.66998+00	2026-06-13 07:58:56.878578+00	\N	aal1	\N	2026-06-13 07:58:56.878465	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	185.3.197.162	\N	\N	\N	\N	\N
844e007f-174d-46ed-844e-3e5f7c55f8e6	59e33504-2910-4ac7-93b1-351a65db7840	2026-06-14 08:23:28.176905+00	2026-06-14 08:23:28.176905+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	185.3.197.162	\N	\N	\N	\N	\N
aa20d6d4-d8ad-4f31-aa72-653f38580edd	59e33504-2910-4ac7-93b1-351a65db7840	2026-06-14 18:55:06.860856+00	2026-06-14 20:51:49.868325+00	\N	aal1	\N	2026-06-14 20:51:49.868206	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	80.215.71.31	\N	\N	\N	\N	\N
912a11b1-4ae1-4dd3-8cf7-917fe068c881	2a93f525-da9e-4d6a-a7b5-c50027e45d01	2026-06-03 15:01:37.675035+00	2026-06-03 15:01:37.675035+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	185.3.197.162	\N	\N	\N	\N	\N
0a00b7dc-1d24-4df4-969d-1b9e452c4a9e	703c689e-9e29-4dd0-b660-61542f248bcc	2026-06-05 09:14:12.235995+00	2026-06-05 09:14:12.235995+00	\N	aal1	\N	\N	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	185.3.197.162	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
aba5e26b-512a-4dfc-b893-dd51c73ebf86	2026-06-25 07:26:20.969051+00	2026-06-25 07:26:20.969051+00	password	b652d950-c0b8-4942-8592-74ac903cff1d
fda1d799-fbd5-408e-9c13-cbd3d425f751	2026-06-27 19:11:25.623117+00	2026-06-27 19:11:25.623117+00	password	88b35879-fd7e-4e9d-9d38-9c51ce058b43
912a11b1-4ae1-4dd3-8cf7-917fe068c881	2026-06-03 15:01:37.68028+00	2026-06-03 15:01:37.68028+00	password	4d526b28-6b01-4afc-874e-68238071cae3
0a00b7dc-1d24-4df4-969d-1b9e452c4a9e	2026-06-05 09:14:12.264659+00	2026-06-05 09:14:12.264659+00	password	b6140fbf-30e7-4140-b3ba-ccd790de7dde
cac57858-1fa7-4dc6-9839-86e838128e72	2026-06-05 09:31:34.556995+00	2026-06-05 09:31:34.556995+00	password	f1e6a297-17fb-455e-890d-0a6433e5a988
7fe346d2-e950-4126-be07-b8dde84a2f33	2026-06-05 10:00:11.451692+00	2026-06-05 10:00:11.451692+00	password	39c2acb2-c7e8-44bc-bdbb-b65f710c1d9a
c72bee07-5293-4d48-87a3-15af69ce5ec4	2026-06-12 11:59:51.717528+00	2026-06-12 11:59:51.717528+00	password	307c6753-671d-48f1-9389-bd5cdc4d332e
844e007f-174d-46ed-844e-3e5f7c55f8e6	2026-06-14 08:23:28.206362+00	2026-06-14 08:23:28.206362+00	password	a0363da0-9e2c-4897-9658-930f0cc37926
aa20d6d4-d8ad-4f31-aa72-653f38580edd	2026-06-14 18:55:06.935464+00	2026-06-14 18:55:06.935464+00	password	d622bdd7-6f8b-4f50-8c09-99d187e8bb7f
1e54033f-8833-47c1-bfa5-e56b6e2eb11e	2026-06-15 16:18:28.851438+00	2026-06-15 16:18:28.851438+00	otp	83e4b94a-49db-4080-89f4-7e099cd7876c
e755e24c-4408-479d-95b2-7234f187e093	2026-06-21 05:32:06.560765+00	2026-06-21 05:32:06.560765+00	password	e40fc23b-5ccd-4991-ad0d-6fdab4a8dd95
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
d13ab338-f0da-40fe-97f6-c6e844dd59db	54e36590-a77d-4ad6-a86e-d18202c47577	confirmation_token	49619157addb78658b5944bf32ef17e6bdb829d86b31095e9e7b7cb3	contact@foodiz.co	2026-06-06 15:19:51.089496	2026-06-06 15:19:51.089496
93e06b36-c148-449d-a3fe-525c3ae77710	a687bafc-e7de-4c72-ae1f-d44ed6db6d15	confirmation_token	edb229377f043b72537477210e07efad5e3dcaf12a44ab02bed84016	lina.bacchieri4@gmail.com	2026-06-15 08:44:14.49321	2026-06-15 08:44:14.49321
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	72	wc4lv2ocw7xn	2a93f525-da9e-4d6a-a7b5-c50027e45d01	f	2026-06-03 15:01:37.677516+00	2026-06-03 15:01:37.677516+00	\N	912a11b1-4ae1-4dd3-8cf7-917fe068c881
00000000-0000-0000-0000-000000000000	73	gmqjlnvbqj6e	703c689e-9e29-4dd0-b660-61542f248bcc	f	2026-06-05 09:14:12.252334+00	2026-06-05 09:14:12.252334+00	\N	0a00b7dc-1d24-4df4-969d-1b9e452c4a9e
00000000-0000-0000-0000-000000000000	74	hxcfe5tc2ruv	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	f	2026-06-05 09:31:34.551298+00	2026-06-05 09:31:34.551298+00	\N	cac57858-1fa7-4dc6-9839-86e838128e72
00000000-0000-0000-0000-000000000000	75	txnj7sqo34ej	55d4f8be-86fd-4145-85f8-ab8756ca7f31	f	2026-06-05 10:00:11.447276+00	2026-06-05 10:00:11.447276+00	\N	7fe346d2-e950-4126-be07-b8dde84a2f33
00000000-0000-0000-0000-000000000000	82	nlzebykhuewy	59e33504-2910-4ac7-93b1-351a65db7840	t	2026-06-12 11:59:51.694063+00	2026-06-13 07:58:56.824882+00	\N	c72bee07-5293-4d48-87a3-15af69ce5ec4
00000000-0000-0000-0000-000000000000	83	7kfdfvacjr43	59e33504-2910-4ac7-93b1-351a65db7840	f	2026-06-13 07:58:56.848925+00	2026-06-13 07:58:56.848925+00	nlzebykhuewy	c72bee07-5293-4d48-87a3-15af69ce5ec4
00000000-0000-0000-0000-000000000000	84	rl2azzf3dbzj	59e33504-2910-4ac7-93b1-351a65db7840	f	2026-06-14 08:23:28.190167+00	2026-06-14 08:23:28.190167+00	\N	844e007f-174d-46ed-844e-3e5f7c55f8e6
00000000-0000-0000-0000-000000000000	85	awbx7crmzqzg	59e33504-2910-4ac7-93b1-351a65db7840	t	2026-06-14 18:55:06.888507+00	2026-06-14 19:53:19.379222+00	\N	aa20d6d4-d8ad-4f31-aa72-653f38580edd
00000000-0000-0000-0000-000000000000	86	gswzpkysm3bj	59e33504-2910-4ac7-93b1-351a65db7840	t	2026-06-14 19:53:19.390299+00	2026-06-14 20:51:49.848064+00	awbx7crmzqzg	aa20d6d4-d8ad-4f31-aa72-653f38580edd
00000000-0000-0000-0000-000000000000	87	tmzr3lizh55q	59e33504-2910-4ac7-93b1-351a65db7840	f	2026-06-14 20:51:49.854518+00	2026-06-14 20:51:49.854518+00	gswzpkysm3bj	aa20d6d4-d8ad-4f31-aa72-653f38580edd
00000000-0000-0000-0000-000000000000	88	vguylupon7lm	2567b3df-b07a-47e6-843a-d1c829f97679	f	2026-06-15 16:18:28.83206+00	2026-06-15 16:18:28.83206+00	\N	1e54033f-8833-47c1-bfa5-e56b6e2eb11e
00000000-0000-0000-0000-000000000000	92	oxhwlrilvkhb	01ebaf96-71b4-4153-8644-76c5bdeaa4ef	f	2026-06-21 05:32:06.542728+00	2026-06-21 05:32:06.542728+00	\N	e755e24c-4408-479d-95b2-7234f187e093
00000000-0000-0000-0000-000000000000	108	so5p4tmrzeft	fc0dcab4-4965-45c8-b78d-ae2211c7e160	t	2026-06-25 07:26:20.940194+00	2026-06-25 09:13:50.156978+00	\N	aba5e26b-512a-4dfc-b893-dd51c73ebf86
00000000-0000-0000-0000-000000000000	109	swqy6uqg3bsz	fc0dcab4-4965-45c8-b78d-ae2211c7e160	t	2026-06-25 09:13:50.172948+00	2026-06-27 13:54:29.43476+00	so5p4tmrzeft	aba5e26b-512a-4dfc-b893-dd51c73ebf86
00000000-0000-0000-0000-000000000000	110	53v6a23oau63	fc0dcab4-4965-45c8-b78d-ae2211c7e160	t	2026-06-27 13:54:29.461919+00	2026-06-27 19:09:35.123872+00	swqy6uqg3bsz	aba5e26b-512a-4dfc-b893-dd51c73ebf86
00000000-0000-0000-0000-000000000000	111	jzrt36glydc3	fc0dcab4-4965-45c8-b78d-ae2211c7e160	f	2026-06-27 19:09:35.142385+00	2026-06-27 19:09:35.142385+00	53v6a23oau63	aba5e26b-512a-4dfc-b893-dd51c73ebf86
00000000-0000-0000-0000-000000000000	112	w7xmoo4mnpdm	fc0dcab4-4965-45c8-b78d-ae2211c7e160	f	2026-06-27 19:11:25.614502+00	2026-06-27 19:11:25.614502+00	\N	fda1d799-fbd5-408e-9c13-cbd3d425f751
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

COPY "public"."profiles" ("id", "role", "email", "first_name", "last_name", "phone", "address", "postal_code", "city", "latitude", "longitude", "avatar_url", "cgu_accepted", "created_at", "updated_at", "full_name", "work_address", "siret", "is_approved", "referral_code", "referral_count", "ref_code", "status", "courier_online", "courier_latitude", "courier_longitude", "courier_location_accuracy_meters", "courier_location_updated_at") FROM stdin;
703c689e-9e29-4dd0-b660-61542f248bcc	client	sourislarsen@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	sourislarsen@gmail.com	\N	\N	t	\N	0	FDZ-ABF9BD66	active	f	\N	\N	\N	\N
2a93f525-da9e-4d6a-a7b5-c50027e45d01	client	sara.larsen64@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	sara.larsen64@gmail.com	\N	\N	t	\N	0	FDZ-66D88173	active	f	\N	\N	\N	\N
4d54499c-88c0-434f-a5cd-5e9e498d5bbe	client	lrsn.saraa@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	lrsn.saraa@gmail.com	\N	\N	t	\N	0	FDZ-390A1D7D	active	f	\N	\N	\N	\N
55d4f8be-86fd-4145-85f8-ab8756ca7f31	client	hexa.bat.landes@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	hexa.bat.landes@gmail.com	\N	\N	t	\N	0	FDZ-01B7C0F8	active	f	\N	\N	\N	\N
54e36590-a77d-4ad6-a86e-d18202c47577	client	contact@foodiz.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	contact@foodiz.co	\N	\N	t	\N	0	FDZ-9CF07C42	active	f	\N	\N	\N	\N
fc0dcab4-4965-45c8-b78d-ae2211c7e160	admin	admin@foodiz.co	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	admin@foodiz.co	\N	\N	t	\N	0	FDZ-4C34CC82	active	f	\N	\N	\N	\N
59e33504-2910-4ac7-93b1-351a65db7840	client	celiaelbenhali@gmail.com	\N	\N	\N	\N	\N	\N	43.89347973364918	-0.5005659856499354	\N	f	2026-06-11 12:53:45.268803+00	2026-06-11 12:53:45.268803+00	celiaelbenhali@gmail.com	\N	\N	t	\N	0	FDZ-80FEBCEB	active	f	\N	\N	\N	\N
a687bafc-e7de-4c72-ae1f-d44ed6db6d15	client	lina.bacchieri4@gmail.com	Lina	BACCHIERI	0782041611	2 Rue des Lyonnais, 75005 Paris, France	75005	Paris	\N	\N	\N	t	2026-06-15 08:44:12.971457+00	2026-06-15 08:44:12.971457+00	Lina BACCHIERI	\N	\N	t	FDZ-F39737	0	FDZ-42F53596	active	f	\N	\N	\N	\N
2567b3df-b07a-47e6-843a-d1c829f97679	courier	boost.btb64@gmail.com	Ella	Test	0766570016	9 rue gambetta	40000	Mont de marsan	\N	\N	\N	t	2026-06-15 16:18:06.032717+00	2026-06-15 16:18:06.032717+00	Ella Test	\N	\N	t	FDZ-EF5F4F	0	FDZ-ED10C73F	active	f	\N	\N	\N	\N
01ebaf96-71b4-4153-8644-76c5bdeaa4ef	client	codex-foodiz-1782019925@example.com	Test	Foodiz	\N	\N	\N	\N	\N	\N	\N	t	2026-06-21 05:32:06.142504+00	2026-06-21 05:32:06.142504+00	Test Foodiz	\N	\N	t	\N	0	FDZ-2CE712D8	active	f	\N	\N	\N	\N
2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	courier	lolitagmnz@gmail.com	Lolita	Gimenez	+33746139238	\N	\N	Mont-de-Marsan	\N	\N	\N	t	2026-06-21 16:49:37.100836+00	2026-06-21 16:49:37.100836+00	Lolita Gimenez	\N	\N	t	\N	0	FDZ-86653FAC	pending	f	\N	\N	\N	\N
bdb54773-79e1-4e3f-a7a2-aa98994c4023	client	silas.davidkelya40@gmail.com	Kelya	Navarlas	+33745095302	\N	\N	40280	\N	\N	\N	t	2026-06-21 16:51:53.571262+00	2026-06-21 16:51:53.571262+00	Kelya Navarlas	\N	\N	t	\N	0	FDZ-6C8F5F3C	active	f	\N	\N	\N	\N
023e8b67-1db9-4697-b9bd-0c6a1ad1310a	client	guilleraultjason@gmail.com	jason	guillerault	+33652855106	\N	\N	Mont de marsan	\N	\N	\N	t	2026-06-21 17:48:39.98802+00	2026-06-21 17:48:39.98802+00	jason guillerault	\N	\N	t	\N	0	FDZ-DFECF725	active	f	\N	\N	\N	\N
a9f12d5d-0efe-48ce-be86-40ed30337182	courier	lolimanel40@gmail.com	Lolita	Gimenez	+33784662424	\N	\N	Mont De Marsan	\N	\N	\N	t	2026-06-22 09:50:45.745078+00	2026-06-22 09:50:45.745078+00	Lolita Gimenez	\N	\N	t	\N	0	FDZ-3BB9409B	pending	f	\N	\N	\N	\N
\.


--
-- Data for Name: admin_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."admin_audit_log" ("id", "admin_id", "action", "entity_type", "entity_id", "reason", "previous_data", "new_data", "created_at") FROM stdin;
\.


--
-- Data for Name: admin_broadcasts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."admin_broadcasts" ("id", "title", "message", "sent_by", "sent_at", "admin_id", "target_roles", "is_sent", "recipients_count", "created_at") FROM stdin;
ca23ff39-7390-4c21-92f7-cf10b050e619	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	\N	2026-06-16 12:58:48.338+00	fc0dcab4-4965-45c8-b78d-ae2211c7e160	{client}	t	7	2026-06-16 12:58:48.43904+00
027cff54-5dd7-4bdf-8124-89105f0e6b82	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	\N	2026-06-24 08:41:43.678+00	fc0dcab4-4965-45c8-b78d-ae2211c7e160	{client}	t	10	2026-06-24 08:41:43.780285+00
\.


--
-- Data for Name: admin_kpis_daily; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."admin_kpis_daily" ("date", "total_revenue_cents", "foodiz_margin_cents", "total_loyalty_provisioned_cents", "total_referral_provisioned_cents") FROM stdin;
\.


--
-- Data for Name: advantage_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."advantage_catalog" ("id", "title", "description", "points_cost", "value_euros", "valid_until", "is_active", "created_at", "cycle_id", "reward_type", "face_value_cents", "minimum_order_cents", "discount_percent", "source", "generated_at", "template_key", "category", "eligible_products", "eligible_establishments") FROM stdin;
c705f6b2-a530-4b99-ac5e-d5a9fc1ea987	Réduction Immédiate	-1,50 € sur votre prochaine commande.	150	1.50	2026-06-03 10:50:39.662775+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
a30c67a7-a6e6-4581-aafb-27c4b5efd460	Livraison Premium	Frais de service entièrement offerts.	250	2.50	2026-06-03 10:50:39.662775+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
888b24de-9718-467e-9670-ffd5b919ddde	Bon d'Achat Foodiz	-5,00 € sur vos courses.	500	5.00	2026-06-03 10:50:39.662775+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
58b10bd5-e798-4490-ae2b-f46e88438a50	Dessert Offert	Un dessert gratuit (max 8,00 €).	800	8.00	2026-06-03 10:50:39.662775+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
b124a121-f71f-433e-a568-074804cb5bfe	Menu Royal Offert	Un menu complet gratuit (max 15,00 €).	1500	15.00	2026-06-03 10:50:39.662775+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
97dccde8-39c7-41b5-a046-17e038fdce2a	Nuit Gourmande	-20,00 € sur vos achats après 22h.	2000	20.00	2026-06-03 10:50:39.662775+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
e8d08bb9-d4e3-47e4-a796-8609c5e31d76	Livraison offerte	Les frais de livraison sont offerts sur votre prochaine commande.	150	0.00	2026-06-21 07:50:12.729528+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
25e6cc08-d45d-4306-8ee4-9799d584b707	Dessert offert max 8€	Un dessert offert dans la limite de 8 euros.	800	8.00	2026-06-21 07:50:12.729528+00	f	2026-06-14 07:50:12.729528+00	\N	fixed_discount	0	0	0	manual	\N	\N	all	{}	{}
78c9fc48-fe06-4288-81ae-9ce9590aec36	Boisson offerte	Une boisson offerte dans la limite de 2,50 €.	250	2.50	2026-06-17 00:18:54.335643+00	f	2026-06-15 00:18:54.335643+00	61d91ca5-3fd5-459f-85d6-5b88fb672856	free_item	250	0	0	rules_engine	2026-06-15 00:18:54.335643+00	250-drink	restaurant	{}	{}
dbf654af-271c-4036-9e1c-9556b588f597	Livraison offerte	Vos frais de livraison sont offerts dans la limite de 5 €.	500	5.00	2026-06-17 00:18:54.335643+00	f	2026-06-15 00:18:54.335643+00	61d91ca5-3fd5-459f-85d6-5b88fb672856	free_delivery	500	0	0	rules_engine	2026-06-15 00:18:54.335643+00	500-delivery	all	{}	{}
4f5104c3-8e11-42f6-90c1-b7dee76e1a49	8 € sur votre commande restaurant	Une réduction sur votre commande restaurant dès 30 € d'achat.	800	8.00	2026-06-17 00:18:54.335643+00	f	2026-06-15 00:18:54.335643+00	61d91ca5-3fd5-459f-85d6-5b88fb672856	fixed_discount	800	3000	0	rules_engine	2026-06-15 00:18:54.335643+00	800-restaurant	restaurant	{}	{}
b4fcaa4b-40fb-404b-bc35-02512ec16f02	Produit Market offert	Un produit Market offert dans la limite de 10 €.	1000	10.00	2026-06-17 00:18:54.335643+00	f	2026-06-15 00:18:54.335643+00	61d91ca5-3fd5-459f-85d6-5b88fb672856	free_item	1000	0	0	rules_engine	2026-06-15 00:18:54.335643+00	1000-market-item	market	{}	{}
4f3df94c-e3b1-4638-a1c1-3d52475d332f	15 € sur vos courses	Une réduction sur vos courses dès 50 € d'achat.	1500	15.00	2026-06-17 00:18:54.335643+00	f	2026-06-15 00:18:54.335643+00	61d91ca5-3fd5-459f-85d6-5b88fb672856	fixed_discount	1500	5000	0	rules_engine	2026-06-15 00:18:54.335643+00	1500-groceries	market	{}	{}
19ef6cc9-7b34-49d5-bd68-f50546960006	Menu premium offert	Un menu premium offert dans la limite de 20 €.	2000	20.00	2026-06-17 00:18:54.335643+00	f	2026-06-15 00:18:54.335643+00	61d91ca5-3fd5-459f-85d6-5b88fb672856	free_item	2000	0	0	rules_engine	2026-06-15 00:18:54.335643+00	2000-premium	restaurant	{}	{}
65fcc1a5-23b8-4580-be72-2b45cc99cfa0	2,50 € sur vos courses	Une réduction sur vos courses dès 15 € d'achat.	250	2.50	2026-06-24 03:09:43.073621+00	f	2026-06-22 03:09:43.073621+00	13935e39-0e9f-48a2-ba32-2bf29eb11c38	fixed_discount	250	1500	0	rules_engine	2026-06-22 03:09:43.073621+00	250-groceries	market	{}	{}
07f7a75c-520e-4788-80e0-c681ae66ebd4	5 € sur vos courses	Une réduction sur vos courses dès 12 € d'achat.	500	5.00	2026-06-24 03:09:43.073621+00	f	2026-06-22 03:09:43.073621+00	13935e39-0e9f-48a2-ba32-2bf29eb11c38	fixed_discount	500	1200	0	rules_engine	2026-06-22 03:09:43.073621+00	500-groceries	market	{}	{}
382b84b9-fc83-44b7-bc42-e292210dc1b5	Dessert offert	Un dessert offert dans la limite de 8 €.	800	8.00	2026-06-24 03:09:43.073621+00	f	2026-06-22 03:09:43.073621+00	13935e39-0e9f-48a2-ba32-2bf29eb11c38	free_item	800	0	0	rules_engine	2026-06-22 03:09:43.073621+00	800-dessert	restaurant	{}	{}
50fec2f3-ce58-4831-8faf-7230a656b76c	10 € sur vos courses	Une réduction sur vos courses dès 35 € d'achat.	1000	10.00	2026-06-24 03:09:43.073621+00	f	2026-06-22 03:09:43.073621+00	13935e39-0e9f-48a2-ba32-2bf29eb11c38	fixed_discount	1000	3500	0	rules_engine	2026-06-22 03:09:43.073621+00	1000-groceries	market	{}	{}
c24852e1-4c0e-4025-82eb-e09430a30180	2,50 € sur vos fruits et légumes	Une réduction sur votre sélection de fruits et légumes dès 10 € d'achat.	250	2.50	2026-06-26 03:30:43.028997+00	f	2026-06-24 03:30:43.028997+00	86e34338-732b-44e7-badf-b48e7a15a653	fixed_discount	250	1000	0	rules_engine	2026-06-24 03:30:43.028997+00	250-produce	market	{}	{}
2a609164-c7bf-43e7-9ae3-c58c7465e3a3	5 € sur le Market	Une réduction sur votre commande Market dès 15 € d'achat.	500	5.00	2026-06-26 03:30:43.028997+00	f	2026-06-24 03:30:43.028997+00	86e34338-732b-44e7-badf-b48e7a15a653	fixed_discount	500	1500	0	rules_engine	2026-06-24 03:30:43.028997+00	500-market	market	{}	{}
e6b1d025-5922-4240-8a2a-2d731cf1cd80	8 € sur vos courses	Une réduction sur vos courses dès 25 € d'achat.	800	8.00	2026-06-26 03:30:43.028997+00	f	2026-06-24 03:30:43.028997+00	86e34338-732b-44e7-badf-b48e7a15a653	fixed_discount	800	2500	0	rules_engine	2026-06-24 03:30:43.028997+00	800-groceries	market	{}	{}
c2437fc8-9269-49a6-9c0b-357942ac0369	10 € sur votre commande restaurant	Une réduction sur votre commande restaurant dès 40 € d'achat.	1000	10.00	2026-06-26 03:30:43.028997+00	f	2026-06-24 03:30:43.028997+00	86e34338-732b-44e7-badf-b48e7a15a653	fixed_discount	1000	4000	0	rules_engine	2026-06-24 03:30:43.028997+00	1000-restaurant	restaurant	{}	{}
fc448419-2ee2-4def-8ad0-86d9f945941b	Panier de fruits offert	Un panier de fruits offert dans la limite de 15 €.	1500	15.00	2026-06-26 03:30:43.028997+00	f	2026-06-24 03:30:43.028997+00	86e34338-732b-44e7-badf-b48e7a15a653	free_item	1500	0	0	rules_engine	2026-06-24 03:30:43.028997+00	1500-fruit	market	{}	{}
ccb2b90a-57e6-4d7b-a8d2-969f293e0669	15 € sur votre commande restaurant	Une réduction sur votre commande restaurant dès 60 € d'achat.	1500	15.00	2026-06-24 03:09:43.073621+00	f	2026-06-22 03:09:43.073621+00	13935e39-0e9f-48a2-ba32-2bf29eb11c38	fixed_discount	1500	6000	0	rules_engine	2026-06-22 03:09:43.073621+00	1500-restaurant	restaurant	{}	{}
c298e6ae-ef91-4734-822c-bd199ceeabc5	Produit Market offert	Un produit Market offert dans la limite de 20 €.	2000	20.00	2026-06-24 03:09:43.073621+00	f	2026-06-22 03:09:43.073621+00	13935e39-0e9f-48a2-ba32-2bf29eb11c38	free_item	2000	0	0	rules_engine	2026-06-22 03:09:43.073621+00	2000-market-item	market	{}	{}
cbd3aa70-72d7-46f2-b5b1-a71d1a57eaa5	Dessert offert	Un dessert offert dans la limite de 2,50 €.	250	2.50	2026-06-29 03:10:15.956794+00	t	2026-06-27 03:10:15.956794+00	2bce1d9c-7c1f-4473-add0-be8a21b95563	free_item	250	0	0	rules_engine	2026-06-27 03:10:15.956794+00	250-dessert	restaurant	{}	{}
2c027b61-deb6-48d0-b623-2f6a449cbb9c	5 € sur votre commande restaurant	Une réduction sur votre commande restaurant dès 20 € d'achat.	500	5.00	2026-06-29 03:10:15.956794+00	t	2026-06-27 03:10:15.956794+00	2bce1d9c-7c1f-4473-add0-be8a21b95563	fixed_discount	500	2000	0	rules_engine	2026-06-27 03:10:15.956794+00	500-restaurant	restaurant	{}	{}
e6899c5b-8cbd-4c8f-b9de-52a7f9dd7dac	Produit Market offert	Un produit Market offert dans la limite de 8 €.	800	8.00	2026-06-29 03:10:15.956794+00	t	2026-06-27 03:10:15.956794+00	2bce1d9c-7c1f-4473-add0-be8a21b95563	free_item	800	0	0	rules_engine	2026-06-27 03:10:15.956794+00	800-market-item	market	{}	{}
a61496e5-3dc6-4c29-baf8-dd95740e36ab	Menu offert	Un menu offert dans la limite de 10 €.	1000	10.00	2026-06-29 03:10:15.956794+00	t	2026-06-27 03:10:15.956794+00	2bce1d9c-7c1f-4473-add0-be8a21b95563	free_item	1000	0	0	rules_engine	2026-06-27 03:10:15.956794+00	1000-menu	restaurant	{}	{}
f82d58fb-d400-48b7-94a4-1cb1ea20dc98	Pack gourmandises offert	Un pack de gourmandises offert dans la limite de 15 €.	1500	15.00	2026-06-29 03:10:15.956794+00	t	2026-06-27 03:10:15.956794+00	2bce1d9c-7c1f-4473-add0-be8a21b95563	free_item	1500	0	0	rules_engine	2026-06-27 03:10:15.956794+00	1500-treats	market	{}	{}
1bbbdeb1-7d75-4571-bde7-8191d6b098bd	20 € sur vos courses	Une réduction sur vos courses dès 80 € d'achat.	2000	20.00	2026-06-29 03:10:15.956794+00	t	2026-06-27 03:10:15.956794+00	2bce1d9c-7c1f-4473-add0-be8a21b95563	fixed_discount	2000	8000	0	rules_engine	2026-06-27 03:10:15.956794+00	2000-groceries	market	{}	{}
1f9ff149-7b46-4602-99d3-bc35b17f8d4d	Livraison gratuite pendant 7 jours	Vos livraisons sont offertes pendant 7 jours, dans la limite totale de 20 €.	2000	20.00	2026-06-26 03:30:43.028997+00	f	2026-06-24 03:30:43.028997+00	86e34338-732b-44e7-badf-b48e7a15a653	free_delivery	2000	0	0	rules_engine	2026-06-24 03:30:43.028997+00	2000-delivery-7d	all	{}	{}
\.


--
-- Data for Name: advantage_generation_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."advantage_generation_runs" ("id", "model_name", "status", "offer_count", "error_message", "generated_at") FROM stdin;
6ad850a3-e8c8-404d-befb-c897c31432ec	gpt-5-mini	failed	0	{\n  "error": {\n    "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.",\n    "type": "insufficient_quota",\n    "param": null,\n    "code": "insufficient_quota"\n  }\n}	2026-06-14 15:56:48.164388+00
a6b749e3-2919-4902-8e46-a2336190b901	gpt-5-mini	failed	0	{\n  "error": {\n    "message": "You exceeded your current quota, please check your plan and billing details. For more information on this error, read the docs: https://platform.openai.com/docs/guides/error-codes/api-errors.",\n    "type": "insufficient_quota",\n    "param": null,\n    "code": "insufficient_quota"\n  }\n}	2026-06-14 16:01:04.453716+00
a0dd6855-41eb-46e2-85f0-3ee34c48c70c	foodiz-rule-engine-v2	success	6	\N	2026-06-15 00:18:54.335643+00
4dbea940-fabd-47b9-9bcc-281c1cc8aa0a	foodiz-rule-engine-v2	success	6	\N	2026-06-22 03:09:43.073621+00
6e3a6020-0014-4d0c-b8e7-632c1a1df51d	foodiz-rule-engine-v2	success	6	\N	2026-06-24 03:30:43.028997+00
87d31f8c-cd9a-4285-a27b-c79f84cbb8a2	foodiz-rule-engine-v2	success	6	\N	2026-06-27 03:10:15.956794+00
\.


--
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."app_settings" ("key", "value", "updated_at") FROM stdin;
launch_status	{"launched": false}	2026-06-21 11:21:04.116064+00
\.


--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."bank_accounts" ("user_id", "iban", "bic", "holder_name", "created_at") FROM stdin;
\.


--
-- Data for Name: client_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_addresses" ("id", "user_id", "label", "full_address", "is_default", "created_at", "address_line", "postal_code", "city", "updated_at") FROM stdin;
\.


--
-- Data for Name: service_areas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."service_areas" ("id", "city", "city_normalized", "postal_codes", "department_code", "region_name", "center_latitude", "center_longitude", "delivery_radius_km", "status", "opened_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: restaurants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."restaurants" ("id", "owner_id", "name", "description", "phone", "address", "postal_code", "city", "latitude", "longitude", "cover_image", "logo_image", "is_active", "status", "siret", "created_at", "updated_at", "cuisine_type", "service_area_id") FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."orders" ("id", "client_id", "restaurant_id", "courier_id", "status", "final_client_total_cents", "partner_total_cents", "service_fee_cents", "internal_fees_cents", "delivery_fee_cents", "courier_earnings_cents", "courier_prime_fund_cents", "loyalty_fund_cents", "referral_fund_cents", "foodiz_revenue_cents", "system_reserve_cents", "delivery_address", "client_latitude", "client_longitude", "delivery_code", "estimated_time_mins", "created_at", "updated_at", "delivered_at", "payment_status", "stripe_payment_intent_id", "points_redeemed_cents", "advantage_discount_cents", "cancellation_reason", "cancelled_at", "refunded_at", "courier_delay_penalty_cents", "client_delay_reward_points", "delivery_delay_seconds", "delay_penalty_applied_at", "delivery_route_distance_meters", "delivery_route_duration_seconds", "delivery_route_provider", "delivery_route_is_fallback", "delivery_route_calculated_at") FROM stdin;
\.


--
-- Data for Name: client_delay_compensations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_delay_compensations" ("id", "order_id", "user_id", "points", "status", "credited_at", "reversed_at") FROM stdin;
\.


--
-- Data for Name: client_delivery_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_delivery_codes" ("order_id", "client_id", "code", "created_at") FROM stdin;
\.


--
-- Data for Name: client_favorites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_favorites" ("id", "user_id", "restaurant_id", "created_at") FROM stdin;
\.


--
-- Data for Name: client_locked_advantages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_locked_advantages" ("id", "user_id", "title", "description", "points_cost", "locked_at", "status", "catalog_id") FROM stdin;
\.


--
-- Data for Name: client_loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_loyalty_transactions" ("id", "user_id", "order_id", "points", "type", "created_at") FROM stdin;
\.


--
-- Data for Name: client_payment_methods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_payment_methods" ("id", "user_id", "last_four", "expiry_date", "brand", "is_default", "created_at") FROM stdin;
\.


--
-- Data for Name: client_rewards; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_rewards" ("id", "user_id", "advantage_id", "title", "description", "points_spent", "reward_code", "status", "expires_at", "used_at", "created_at") FROM stdin;
\.


--
-- Data for Name: client_wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."client_wallets" ("id", "user_id", "points_balance", "loyalty_tier", "created_at", "updated_at") FROM stdin;
9a594fe5-26e1-496c-8a4a-254ac923c1ec	703c689e-9e29-4dd0-b660-61542f248bcc	0	bronze	2026-06-14 12:55:16.733723+00	2026-06-14 12:55:16.733723+00
4dd06910-3423-4d31-ad5a-6b63738fa416	2a93f525-da9e-4d6a-a7b5-c50027e45d01	0	bronze	2026-06-14 12:55:16.733723+00	2026-06-14 12:55:16.733723+00
55140d91-7e4b-43c1-b572-732d4f33c1f8	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	0	bronze	2026-06-14 12:55:16.733723+00	2026-06-14 12:55:16.733723+00
50d723d9-2a95-4528-9dd0-1f3411da5b84	55d4f8be-86fd-4145-85f8-ab8756ca7f31	0	bronze	2026-06-14 12:55:16.733723+00	2026-06-14 12:55:16.733723+00
f11ea01f-8142-4b99-a3a5-731d1331a101	54e36590-a77d-4ad6-a86e-d18202c47577	0	bronze	2026-06-14 12:55:16.733723+00	2026-06-14 12:55:16.733723+00
e40e7bd8-c664-47aa-a41b-6e63301155d5	59e33504-2910-4ac7-93b1-351a65db7840	0	bronze	2026-06-14 12:55:16.733723+00	2026-06-14 12:55:16.733723+00
7c050ff6-4dc9-4701-91dd-22811006d504	a687bafc-e7de-4c72-ae1f-d44ed6db6d15	0	bronze	2026-06-15 08:44:12.971457+00	2026-06-15 08:44:12.971457+00
fda27511-a114-4fc3-b874-dc7ed51311fb	2567b3df-b07a-47e6-843a-d1c829f97679	0	bronze	2026-06-15 16:18:06.032717+00	2026-06-15 16:18:06.032717+00
d7692279-6f0f-4cb4-a741-9f6183a1860a	01ebaf96-71b4-4153-8644-76c5bdeaa4ef	0	bronze	2026-06-21 05:32:06.142504+00	2026-06-21 05:32:06.142504+00
d60b4877-3e52-4fd7-9cff-e1c70ee27918	bdb54773-79e1-4e3f-a7a2-aa98994c4023	0	bronze	2026-06-21 16:51:53.571262+00	2026-06-21 16:51:53.571262+00
9bfe8e88-c784-4fc1-865d-b8a867678e6c	023e8b67-1db9-4697-b9bd-0c6a1ad1310a	0	bronze	2026-06-21 17:48:39.98802+00	2026-06-21 17:48:39.98802+00
\.


--
-- Data for Name: courier_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_applications" ("id", "user_id", "status", "city", "vehicle_type", "documents_url", "created_at", "updated_at", "legal_name", "siret", "address", "postal_code", "document_review_status", "document_review_comment", "identity_name_confirmed", "business_identity_confirmed", "reviewed_by", "reviewed_at", "dispatch_priority_score", "service_area_id") FROM stdin;
d8e074a0-90a8-4f94-a3aa-c77b85f10ad1	2567b3df-b07a-47e6-843a-d1c829f97679	pending	Mont de marsan	\N	\N	2026-06-15 16:18:06.032717+00	2026-06-15 16:18:06.032717+00	\N	\N	\N	\N	documents_required	\N	f	f	\N	\N	100	\N
91e3172f-2cf2-4820-ab5e-9801dd4949b5	2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	pending	Mont-de-Marsan	\N	\N	2026-06-21 16:49:37.100836+00	2026-06-21 16:49:37.100836+00	\N	\N	\N	\N	documents_required	\N	f	f	\N	\N	100	\N
ecea6b57-00bc-42c4-b372-be0f2ae469d8	a9f12d5d-0efe-48ce-be86-40ed30337182	pending	Mont De Marsan	\N	\N	2026-06-22 09:50:45.745078+00	2026-06-22 09:50:45.745078+00	\N	\N	\N	\N	documents_required	\N	f	f	\N	\N	100	\N
\.


--
-- Data for Name: courier_delay_penalties; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_delay_penalties" ("id", "order_id", "courier_id", "client_id", "pickup_at", "expected_arrival_at", "delivered_at", "delay_seconds", "penalty_tier", "penalty_cents", "reward_points", "dispatch_priority_delta", "eta_provider", "rule_version", "status", "decision_reason", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: prelaunch_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."prelaunch_profiles" ("id", "user_id", "role", "first_name", "last_name", "email", "phone", "city", "status", "marketing_consent", "consent_at", "launch_token", "launch_token_expires_at", "launch_notified_at", "activated_at", "created_at", "updated_at", "access_enabled", "access_enabled_at", "access_enabled_by") FROM stdin;
6156fdb9-3b04-4abb-a39f-9c6062ffb839	2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	livreur	Lolita	Gimenez	lolitagmnz@gmail.com	+33746139238	Mont-de-Marsan	prelaunch_pending	t	2026-06-21 16:49:37.303+00	\N	\N	\N	\N	2026-06-21 16:49:37.575129+00	2026-06-21 16:49:37.575129+00	f	\N	\N
42f0813e-a9d8-483f-a5a1-a882f911c7cd	bdb54773-79e1-4e3f-a7a2-aa98994c4023	client	Kelya	Navarlas	silas.davidkelya40@gmail.com	+33745095302	40280	prelaunch_pending	t	2026-06-21 16:51:53.668+00	\N	\N	\N	\N	2026-06-21 16:51:53.766968+00	2026-06-21 16:51:53.766968+00	f	\N	\N
f6cf2863-345c-42d1-b663-672f5599fa7b	023e8b67-1db9-4697-b9bd-0c6a1ad1310a	client	jason	guillerault	guilleraultjason@gmail.com	+33652855106	Mont de marsan	prelaunch_pending	t	2026-06-21 17:48:40.092+00	\N	\N	\N	\N	2026-06-21 17:48:40.351865+00	2026-06-21 17:48:40.351865+00	f	\N	\N
0f44c0ae-a162-4ed9-860d-71dbd2f19267	a9f12d5d-0efe-48ce-be86-40ed30337182	livreur	Lolita	Gimenez	lolimanel40@gmail.com	+33784662424	Mont De Marsan	prelaunch_pending	t	2026-06-22 09:50:45.977+00	\N	\N	\N	\N	2026-06-22 09:50:46.068424+00	2026-06-22 09:50:46.068424+00	f	\N	\N
\.


--
-- Data for Name: courier_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_documents" ("id", "user_id", "prelaunch_profile_id", "document_type", "storage_path", "original_name", "mime_type", "size_bytes", "status", "review_comment", "reviewed_by", "reviewed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: courier_prime_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_prime_transactions" ("id", "courier_id", "order_id", "points", "amount_cents", "type", "created_at") FROM stdin;
\.


--
-- Data for Name: courier_prime_wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_prime_wallets" ("courier_id", "points_balance", "euro_balance", "total_earned_cents", "total_withdrawn_cents", "updated_at") FROM stdin;
\.


--
-- Data for Name: courier_prime_withdrawals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."courier_prime_withdrawals" ("id", "courier_id", "points_used", "amount_cents", "status", "requested_at", "approved_at", "paid_at") FROM stdin;
\.


--
-- Data for Name: delivery_code_verifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."delivery_code_verifications" ("order_id", "code_hash", "created_at", "failed_attempts", "locked_until", "last_failed_at") FROM stdin;
\.


--
-- Data for Name: delivery_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."delivery_tracking" ("id", "order_id", "courier_id", "pickup_latitude", "pickup_longitude", "pickup_at", "current_latitude", "current_longitude", "current_location_name", "dropoff_latitude", "dropoff_longitude", "dropoff_at", "status", "estimated_arrival_at", "actual_delivery_at", "created_at", "updated_at", "pickup_route_duration_seconds", "pickup_route_distance_meters", "pickup_expected_arrival_at", "eta_provider", "eta_verified_at", "pickup_gps_accuracy_meters") FROM stdin;
\.


--
-- Data for Name: driver_dispatch_scores; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."driver_dispatch_scores" ("id", "courier_id", "order_id", "score", "distance_to_restaurant_m", "distance_to_client_m", "calculated_at") FROM stdin;
\.


--
-- Data for Name: driver_earnings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."driver_earnings" ("id", "courier_id", "order_id", "amount_cents", "type", "created_at") FROM stdin;
\.


--
-- Data for Name: settlement_statements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."settlement_statements" ("id", "document_number", "beneficiary_id", "beneficiary_type", "beneficiary_name", "legal_identifier", "period_start", "period_end", "amount_cents", "currency", "status", "payment_method", "payment_reference", "notes", "generated_by", "generated_at", "paid_at", "cancelled_at") FROM stdin;
\.


--
-- Data for Name: financial_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."financial_documents" ("id", "document_number", "document_type", "recipient_id", "recipient_email", "order_id", "settlement_id", "payload_snapshot", "status", "generated_at", "last_emailed_at") FROM stdin;
\.


--
-- Data for Name: financial_document_email_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."financial_document_email_events" ("id", "document_id", "recipient_email", "status", "provider_message_id", "error_message", "created_at") FROM stdin;
\.


--
-- Data for Name: foodiz_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."foodiz_campaigns" ("id", "restaurant_id", "title", "message", "objective", "audience", "status", "scheduled_at", "sent_at", "recipients_count", "opened_count", "clicked_count", "orders_generated", "estimated_revenue", "created_at") FROM stdin;
\.


--
-- Data for Name: foodiz_plus_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."foodiz_plus_plans" ("id", "name", "monthly_price_cents", "yearly_price_cents", "monthly_campaign_limit", "weekly_campaign_limit", "max_cities_per_campaign", "priority_level", "features", "is_active", "created_at", "updated_at") FROM stdin;
discovery	Découverte	3999	40790	8	2	1	1	["Génération automatique", "Ciblage ville et audience", "Statistiques essentielles"]	t	2026-06-14 17:29:45.17202+00	2026-06-14 17:29:45.17202+00
boost	Boost	7999	81590	15	4	1	2	["Génération automatique avancée", "Programmation", "Statistiques détaillées", "Priorité haute"]	t	2026-06-14 17:29:45.17202+00	2026-06-14 17:29:45.17202+00
domination	Domination Locale	11999	122390	25	7	5	3	["Multi-villes", "Programmation avancée", "Ciblage précis", "Priorité maximale", "Recommandations automatiques"]	t	2026-06-14 17:29:45.17202+00	2026-06-14 17:29:45.17202+00
\.


--
-- Data for Name: fraud_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."fraud_logs" ("id", "user_id", "order_id", "risk_score", "status", "reason", "created_at") FROM stdin;
\.


--
-- Data for Name: loyalty_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."loyalty_balances" ("user_id", "balance_cents", "updated_at") FROM stdin;
fc0dcab4-4965-45c8-b78d-ae2211c7e160	0	2026-06-03 12:58:53.770109+00
2a93f525-da9e-4d6a-a7b5-c50027e45d01	0	2026-06-03 15:01:37.633132+00
703c689e-9e29-4dd0-b660-61542f248bcc	0	2026-06-05 09:14:12.158606+00
4d54499c-88c0-434f-a5cd-5e9e498d5bbe	0	2026-06-05 09:31:34.526126+00
55d4f8be-86fd-4145-85f8-ab8756ca7f31	0	2026-06-05 10:00:11.394761+00
59e33504-2910-4ac7-93b1-351a65db7840	0	2026-06-05 13:09:34.45646+00
54e36590-a77d-4ad6-a86e-d18202c47577	0	2026-06-06 15:19:44.496261+00
a687bafc-e7de-4c72-ae1f-d44ed6db6d15	0	2026-06-15 08:44:12.971457+00
2567b3df-b07a-47e6-843a-d1c829f97679	0	2026-06-15 16:18:06.032717+00
01ebaf96-71b4-4153-8644-76c5bdeaa4ef	0	2026-06-21 05:32:06.142504+00
2053dbd5-ac8e-40e6-ab2a-93b3d55c7a08	0	2026-06-21 16:49:37.100836+00
bdb54773-79e1-4e3f-a7a2-aa98994c4023	0	2026-06-21 16:51:53.571262+00
023e8b67-1db9-4697-b9bd-0c6a1ad1310a	0	2026-06-21 17:48:39.98802+00
a9f12d5d-0efe-48ce-be86-40ed30337182	0	2026-06-22 09:50:45.745078+00
\.


--
-- Data for Name: loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."loyalty_transactions" ("id", "user_id", "order_id", "type", "amount_cents", "created_at") FROM stdin;
\.


--
-- Data for Name: partner_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_subscriptions" ("id", "restaurant_id", "stripe_subscription_id", "plan_id", "billing_period", "status", "current_period_start", "current_period_end", "cancel_at_period_end", "canceled_at", "last_payment_date", "created_at", "updated_at", "campaigns_used_period", "stripe_customer_id", "stripe_checkout_session_id") FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."products" ("id", "restaurant_id", "name", "description", "partner_price_cents", "image_url", "category", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: marketing_campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."marketing_campaigns" ("id", "restaurant_id", "title", "description", "discount_percent", "discount_cents", "min_order_cents", "start_date", "end_date", "is_active", "created_at", "updated_at", "product_id", "target_city", "target_audience", "template_key", "status", "scheduled_at", "sent_at", "recipient_count", "opened_count", "clicked_count", "converted_orders_count", "subscription_id") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notifications" ("id", "user_id", "title", "message", "type", "is_read", "related_order_id", "created_at", "link") FROM stdin;
268e4ab5-285d-491b-8b00-5b13b993be9e	59e33504-2910-4ac7-93b1-351a65db7840	Réponse du support Foodiz	L'administrateur a répondu à votre demande "article manquant". Cliquez pour consulter.	support	f	\N	2026-06-16 12:54:57.870657+00	/client/help-center
040e6a2a-1897-4ddc-a3eb-0bd23a35d686	59e33504-2910-4ac7-93b1-351a65db7840	Réponse du support Foodiz	L'administrateur a répondu à votre demande "article manquant". Cliquez pour consulter.	support	f	\N	2026-06-16 12:56:19.772068+00	/client/help-center
47b564fd-1825-433e-b453-51025e47c25c	59e33504-2910-4ac7-93b1-351a65db7840	Réponse du support Foodiz	L'administrateur a répondu à votre demande "article manquant". Cliquez pour consulter.	support	f	\N	2026-06-16 12:56:24.618465+00	/client/help-center
bed66ab8-7e6e-4c4d-9d98-6d540b3722b5	703c689e-9e29-4dd0-b660-61542f248bcc	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
8dbe8eaa-7110-4ad5-86e6-b8ed6588c6bc	2a93f525-da9e-4d6a-a7b5-c50027e45d01	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
45b7d34c-8ec4-4603-8186-551c714f021b	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
4792715d-135f-493c-99e3-17781ae83ae4	55d4f8be-86fd-4145-85f8-ab8756ca7f31	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
c1e5e417-2479-4a8c-8dc7-45621d55f3f8	54e36590-a77d-4ad6-a86e-d18202c47577	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
345780c3-107a-4bda-aa4f-8a0ce2926710	59e33504-2910-4ac7-93b1-351a65db7840	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
b3877f7e-330f-43ae-8f7c-2793fbc90606	a687bafc-e7de-4c72-ae1f-d44ed6db6d15	-20% sur vos courses 	Offre valable sur un montant maximum de 25 € d’achat. 	info	f	\N	2026-06-16 12:58:48.326539+00	\N
2e586624-c60f-4aba-9dfb-0bf380429d11	703c689e-9e29-4dd0-b660-61542f248bcc	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
3458ae31-d07f-4923-b50a-d5d8b27bf559	2a93f525-da9e-4d6a-a7b5-c50027e45d01	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
67c4ac91-aa21-45d9-8b7d-187b984a80c3	4d54499c-88c0-434f-a5cd-5e9e498d5bbe	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
febd126f-e65b-468e-80fe-694c23043030	55d4f8be-86fd-4145-85f8-ab8756ca7f31	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
e72c69e4-02cc-478c-9d5d-5c548d978534	54e36590-a77d-4ad6-a86e-d18202c47577	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
a94624a3-077e-456d-86f1-e9cf1e7da4b3	59e33504-2910-4ac7-93b1-351a65db7840	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
319fa6a3-9e06-4977-aacb-bef0045f3f88	a687bafc-e7de-4c72-ae1f-d44ed6db6d15	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
496a769c-1ce4-4463-a97a-c077725c2511	01ebaf96-71b4-4153-8644-76c5bdeaa4ef	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
3bf0bb50-3c6a-46b6-aeff-310b7bb04bdc	bdb54773-79e1-4e3f-a7a2-aa98994c4023	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
6ab0970d-98ea-437c-8f3a-787e94f03273	023e8b67-1db9-4697-b9bd-0c6a1ad1310a	Avis à tous nos Foodizers !	Ceci est une notification « test » afin de vérifier si vous recevez bien nos notifications. Vous êtes parmi les premiers à nous rejoindre, merci à vous de contribuer au lancement de Foodiz, vous êtes géniaux ! 🤩	info	f	\N	2026-06-24 08:41:43.625319+00	\N
\.


--
-- Data for Name: marketing_campaign_deliveries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."marketing_campaign_deliveries" ("id", "campaign_id", "user_id", "notification_id", "delivered_at", "opened_at", "clicked_at", "converted_order_id", "created_at") FROM stdin;
\.


--
-- Data for Name: order_advantage_redemptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_advantage_redemptions" ("id", "order_id", "user_id", "locked_advantage_id", "advantage_id", "points_cost", "discount_cents", "status", "reserved_at", "applied_at", "released_at") FROM stdin;
\.


--
-- Data for Name: order_financial_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_financial_ledger" ("id", "order_id", "client_id", "restaurant_id", "partner_user_id", "courier_id", "client_collected_cents", "advantage_funded_cents", "partner_cents", "delivery_fee_cents", "service_fee_cents", "courier_earnings_cents", "courier_prime_cents", "foodiz_revenue_cents", "internal_fees_cents", "loyalty_fund_cents", "loyalty_redeemed_cents", "referral_fund_cents", "system_reserve_cents", "payment_status", "order_status", "paid_at", "delivered_at", "created_at", "updated_at", "courier_penalty_cents") FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_items" ("id", "order_id", "product_id", "quantity", "unit_price_cents", "total_price_cents", "created_at", "partner_unit_price_cents", "partner_total_price_cents") FROM stdin;
\.


--
-- Data for Name: order_loyalty_credits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_loyalty_credits" ("id", "order_id", "user_id", "points", "status", "credited_at", "reversed_at") FROM stdin;
\.


--
-- Data for Name: order_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."order_payments" ("id", "order_id", "stripe_payment_intent_id", "amount_cents", "currency", "status", "client_secret", "receipt_email", "created_at", "updated_at", "stripe_checkout_session_id") FROM stdin;
\.


--
-- Data for Name: partner_applications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_applications" ("id", "user_id", "city", "status", "created_at", "updated_at", "business_name", "siret", "description", "categories", "phone", "email", "address", "postal_code", "latitude", "longitude", "website", "documents_url", "rejection_reason", "reviewed_by", "reviewed_at", "service_area_id", "establishment_type", "handles_animal_products", "sells_alcohol", "requires_hygiene_proof", "compliance_status", "compliance_comment", "documents_submitted_at") FROM stdin;
\.


--
-- Data for Name: partner_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_documents" ("id", "user_id", "application_id", "document_type", "storage_path", "original_name", "mime_type", "size_bytes", "status", "valid_until", "review_comment", "reviewed_by", "reviewed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: partner_menu_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."partner_menu_categories" ("id", "restaurant_id", "name", "created_at") FROM stdin;
\.


--
-- Data for Name: payouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payouts" ("id", "user_id", "amount_cents", "status", "created_at", "currency", "stripe_payout_id", "failure_reason", "requested_at", "paid_at", "updated_at", "settlement_id", "payment_reference", "beneficiary_type", "period_start", "period_end") FROM stdin;
\.


--
-- Data for Name: prelaunch_driver_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."prelaunch_driver_details" ("id", "prelaunch_profile_id", "vehicle_type", "availability", "created_at", "updated_at", "siret", "legal_name", "address", "postal_code", "document_review_status", "document_review_comment", "document_upload_token_hash", "document_upload_token_expires_at", "documents_submitted_at", "reviewed_by", "reviewed_at") FROM stdin;
fbc2c7bb-4610-4c73-83fb-2efd33e45e5a	6156fdb9-3b04-4abb-a39f-9c6062ffb839	velo	journee	2026-06-21 16:49:37.698176+00	2026-06-21 16:49:37.698176+00	89110571000018	\N	\N	\N	documents_required	\N	\N	\N	\N	\N	\N
08a63b22-20b9-403f-af13-137aec117e27	0f44c0ae-a162-4ed9-860d-71dbd2f19267	velo	journee	2026-06-22 09:50:46.402685+00	2026-06-22 09:50:46.402685+00	83096525700025	\N	\N	\N	documents_required	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: prelaunch_partner_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."prelaunch_partner_details" ("id", "prelaunch_profile_id", "establishment_name", "establishment_type", "siret", "created_at", "updated_at", "address", "postal_code", "handles_animal_products", "sells_alcohol", "requires_hygiene_proof", "document_review_status", "document_review_comment", "documents_submitted_at", "document_upload_token_hash", "document_upload_token_expires_at", "reviewed_by", "reviewed_at") FROM stdin;
\.


--
-- Data for Name: prelaunch_registration_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."prelaunch_registration_attempts" ("id", "fingerprint_hash", "email_hash", "created_at") FROM stdin;
1	a2e219f0bbea19f3f5f638c3e5d43e4ce34538153730f21a0de505f480c67b04	bec46282ba8e80c2bf76941dadb3f77f2f0bce0eeecd134cbbd15e549e8f24b8	2026-06-21 16:49:36.011459+00
2	40c702e4c96e9e2ff8de8cf5c8374233792ba1dfbab1ef63ea42767f4a172217	961204634210a29ce90efa833fe3308223adcb82481c83fef6fa201671542637	2026-06-21 16:51:52.60953+00
3	31bef6c6ade97e7bbc791a39308784c0f0b864191e33c7fcac43ad3d65bd6bd1	145111868aabe4e3bd356876f55e49a52b23f8d0e85ebaf4cdb41b9dd1d3e471	2026-06-21 17:48:39.010823+00
4	0e31bc15739a67e130577f1ec09d05389f100f96297b3154646593095ee86c10	e16ee9efc01f54db91f1e13f2f37fee0be9be5b3e6318c41745a4b56e90d0e36	2026-06-22 09:49:55.976326+00
5	0e31bc15739a67e130577f1ec09d05389f100f96297b3154646593095ee86c10	e16ee9efc01f54db91f1e13f2f37fee0be9be5b3e6318c41745a4b56e90d0e36	2026-06-22 09:50:44.793793+00
6	09c7d0dd38488646316c879502196dd0f40b4f8517c5b0e66a615463a6e8cbb7	7a74dea551d40f24fd5ed9e6c7c1ce4f1caf77c1671942e21fc2139e87cda87a	2026-06-25 00:29:07.075053+00
7	09c7d0dd38488646316c879502196dd0f40b4f8517c5b0e66a615463a6e8cbb7	7a74dea551d40f24fd5ed9e6c7c1ce4f1caf77c1671942e21fc2139e87cda87a	2026-06-25 00:29:31.605909+00
8	09c7d0dd38488646316c879502196dd0f40b4f8517c5b0e66a615463a6e8cbb7	7a74dea551d40f24fd5ed9e6c7c1ce4f1caf77c1671942e21fc2139e87cda87a	2026-06-25 00:29:59.92809+00
9	09c7d0dd38488646316c879502196dd0f40b4f8517c5b0e66a615463a6e8cbb7	7a74dea551d40f24fd5ed9e6c7c1ce4f1caf77c1671942e21fc2139e87cda87a	2026-06-25 00:30:45.621427+00
10	09c7d0dd38488646316c879502196dd0f40b4f8517c5b0e66a615463a6e8cbb7	7a74dea551d40f24fd5ed9e6c7c1ce4f1caf77c1671942e21fc2139e87cda87a	2026-06-25 00:31:13.232613+00
\.


--
-- Data for Name: referral_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."referral_codes" ("id", "user_id", "code", "created_at") FROM stdin;
\.


--
-- Data for Name: referrals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."referrals" ("id", "parrain_id", "filleul_id", "status", "created_at", "code", "reward_cents", "completed_at", "reward_points") FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."reviews" ("id", "order_id", "client_id", "restaurant_rating", "courier_rating", "comment", "created_at") FROM stdin;
\.


--
-- Data for Name: settlement_statement_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."settlement_statement_items" ("id", "statement_id", "order_id", "allocation_type", "amount_cents", "created_at") FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_tickets" ("id", "user_id", "subject", "message", "status", "priority", "created_at", "updated_at", "user_email", "admin_response", "category", "subcategory", "order_id", "user_role", "diagnostic", "attempted_actions", "source", "resolution_summary", "auto_resolved", "resolved_at", "resolved_by") FROM stdin;
f671b026-c92e-4a82-8fcc-52e2a40e003d	59e33504-2910-4ac7-93b1-351a65db7840	article manquant	non recu	closed	normal	2026-06-14 08:24:20.585723+00	2026-06-14 08:24:20.585723+00	celiaelbenhali@gmail.com	Traiter test 2 ne s’est pas supprimer après avoir été traité et n’a pas été transférer vers les anciennes demandes ( historiques des demandes traitée) 	other	\N	\N	\N	{}	{}	manual	\N	f	\N	\N
\.


--
-- Data for Name: support_ticket_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."support_ticket_events" ("id", "ticket_id", "actor_id", "event_type", "message", "previous_status", "new_status", "created_at") FROM stdin;
\.


--
-- Data for Name: test_foodiz_permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."test_foodiz_permission" ("id", "created_at") FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") FROM stdin;
avatars	avatars	\N	2026-06-01 14:09:43.894137+00	2026-06-01 14:09:43.894137+00	t	f	\N	\N	\N	STANDARD
courier-documents	courier-documents	\N	2026-06-21 22:13:32.268072+00	2026-06-21 22:13:32.268072+00	f	f	8388608	{image/jpeg,image/png,application/pdf}	\N	STANDARD
restaurant-media	restaurant-media	\N	2026-06-23 09:12:15.116777+00	2026-06-23 09:12:15.116777+00	t	f	5242880	{image/jpeg,image/png,image/webp}	\N	STANDARD
profile-media	profile-media	\N	2026-06-23 09:12:15.116777+00	2026-06-23 09:12:15.116777+00	t	f	3145728	{image/jpeg,image/png,image/webp}	\N	STANDARD
partner-documents	partner-documents	\N	2026-06-23 20:04:45.62737+00	2026-06-23 20:04:45.62737+00	f	f	10485760	{image/jpeg,image/png,application/pdf}	\N	STANDARD
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
8be1170a-3f76-420c-b3b0-d1198ee3315b	avatars	910a63c7-669a-478d-a3b7-7a656347f202.PNG	910a63c7-669a-478d-a3b7-7a656347f202	2026-06-01 15:00:34.125797+00	2026-06-01 15:00:34.125797+00	2026-06-01 15:00:34.125797+00	{"eTag": "\\"31361d0f3c3857a39f67df4307f1bfa9\\"", "size": 3239718, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-06-01T15:00:35.000Z", "contentLength": 3239718, "httpStatusCode": 200}	4d5f0d83-43be-4ebf-bc8b-120aef1bff43	910a63c7-669a-478d-a3b7-7a656347f202	{}
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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 112, true);


--
-- Name: financial_document_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."financial_document_number_seq"', 1, false);


--
-- Name: prelaunch_registration_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."prelaunch_registration_attempts_id_seq"', 10, true);


--
-- Name: settlement_document_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."settlement_document_number_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict joW5cMdgMoXGrOtVX0t2FqGfkXwR2mI1ZqIO5neq41mIXv4mboTdsXSZTFeZe3J

RESET ALL;
