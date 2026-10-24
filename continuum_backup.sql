--
-- PostgreSQL database dump
--

\restrict b5HKNpIjZMsb5ocjsmuMh6ccH4hCU6X2EbwTdN9nw3JMeobvvohaJ92m9fXE16T

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.admins (
    id character varying NOT NULL,
    email character varying NOT NULL,
    supabase_user_id character varying,
    password_hash character varying,
    name character varying NOT NULL,
    role character varying NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.admins OWNER TO continuum;

--
-- Name: employee_projects; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.employee_projects (
    employee_id character varying NOT NULL,
    project_id character varying NOT NULL,
    role character varying,
    joined_at timestamp without time zone
);


ALTER TABLE public.employee_projects OWNER TO continuum;

--
-- Name: employee_resources; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.employee_resources (
    id character varying NOT NULL,
    employee_id character varying,
    project_id character varying,
    provider character varying NOT NULL,
    resource_type character varying NOT NULL,
    external_resource_id character varying NOT NULL,
    external_url character varying,
    name character varying NOT NULL,
    resource_metadata json,
    status character varying NOT NULL,
    last_synced_at timestamp without time zone,
    last_successful_sync_at timestamp without time zone,
    last_sync_error text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.employee_resources OWNER TO continuum;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.employees (
    id character varying NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    role character varying NOT NULL,
    team character varying NOT NULL,
    status character varying NOT NULL,
    skills json,
    jira_account_id character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.employees OWNER TO continuum;

--
-- Name: handover_audit_logs; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.handover_audit_logs (
    id character varying NOT NULL,
    handover_id character varying NOT NULL,
    admin_id character varying,
    action character varying NOT NULL,
    previous_status character varying,
    new_status character varying,
    reason text,
    metadata json,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.handover_audit_logs OWNER TO continuum;

--
-- Name: handovers; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.handovers (
    id character varying NOT NULL,
    employee_id character varying NOT NULL,
    project_id character varying,
    status character varying NOT NULL,
    generated_summary text,
    knowledge_package json,
    recommended_successor_id character varying,
    risk_summary json,
    recipient_email character varying,
    sent_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.handovers OWNER TO continuum;

--
-- Name: knowledge_chunks; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.knowledge_chunks (
    id character varying NOT NULL,
    document_id character varying NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    chunk_metadata json,
    embedding_id character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.knowledge_chunks OWNER TO continuum;

--
-- Name: knowledge_documents; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.knowledge_documents (
    id character varying NOT NULL,
    resource_id character varying,
    employee_id character varying,
    project_id character varying,
    provider character varying NOT NULL,
    external_id character varying NOT NULL,
    title character varying NOT NULL,
    content text NOT NULL,
    content_hash character varying NOT NULL,
    source_url character varying,
    doc_metadata json,
    last_synced_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.knowledge_documents OWNER TO continuum;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.notifications (
    id character varying NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    message text NOT NULL,
    data json,
    read boolean NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE public.notifications OWNER TO continuum;

--
-- Name: oauth_connections; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.oauth_connections (
    id character varying NOT NULL,
    provider character varying NOT NULL,
    connection_type character varying NOT NULL,
    access_token_encrypted text,
    refresh_token_encrypted text,
    expires_at timestamp without time zone,
    scopes json,
    provider_account_id character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.oauth_connections OWNER TO continuum;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.projects (
    id character varying NOT NULL,
    name character varying NOT NULL,
    description text,
    status character varying NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.projects OWNER TO continuum;

--
-- Name: risk_scores; Type: TABLE; Schema: public; Owner: continuum
--

CREATE TABLE public.risk_scores (
    id character varying NOT NULL,
    employee_id character varying,
    project_id character varying,
    knowledge_score double precision NOT NULL,
    continuity_risk double precision NOT NULL,
    bus_factor integer NOT NULL,
    risk_level character varying NOT NULL,
    risk_reasons json,
    calculated_at timestamp without time zone NOT NULL
);


ALTER TABLE public.risk_scores OWNER TO continuum;

--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.admins (id, email, supabase_user_id, password_hash, name, role, is_active, created_at, updated_at) FROM stdin;
3967c513-d4a0-4236-8232-05b49ae66cfd	admin@continuum.io	\N	e69fb8f6ca00c8206b58a85f5240c64f474b11676e26ef82e5f4ea24aad74047	Company Administrator	admin	t	2026-10-15 15:55:38.890371	2026-10-15 15:55:38.890379
d9649dd8-24a0-4a46-b7b5-1e1f93f99288	roteparas7@gmail.com	4b963e0b-7da5-499e-8d45-cd4dbae12b32	b1d0998fbdd9adad3e5369bcd9585f5cd6ea9a52272ac28c74c897250bfc287e	Paras Rote	admin	t	2026-10-15 17:17:41.352346	2026-10-15 17:17:41.352355
\.


--
-- Data for Name: employee_projects; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.employee_projects (employee_id, project_id, role, joined_at) FROM stdin;
\.


--
-- Data for Name: employee_resources; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.employee_resources (id, employee_id, project_id, provider, resource_type, external_resource_id, external_url, name, resource_metadata, status, last_synced_at, last_successful_sync_at, last_sync_error, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.employees (id, name, email, role, team, status, skills, jira_account_id, created_at, updated_at) FROM stdin;
bd3223ae-9770-4e0f-ae0b-8351842332b1	Shivay Oberoi	rahulppatil1446@gmail.com	Senior backend developer	Engineering	ACTIVE	["FastAPI", "Python"]	\N	2026-10-15 18:58:29.209387	2026-10-15 18:58:29.209463
1a81faf6-fd60-4183-ab2e-4655ad6d4f35	Sudha Sharma	arpatoke@gmail.com	Full Stack Developer	Product Engineering	ACTIVE	["React", "TypeScript", "Node.js", "MongoDB", "Git"]	\N	2026-10-15 19:03:46.813032	2026-10-15 19:03:46.813054
ce5470fd-a52a-453f-a117-7aa90c3ffe6d	Radheshyam Tiwari	parasrote07@gmail.com	DevOps Engineer	Cloud Infrastructure	ACTIVE	["Docker", "Kubernetes", "AWS", "CI/CD", "Linux"]	\N	2026-10-15 19:09:01.994175	2026-10-15 19:09:01.994299
c214927f-c44e-4a25-97f8-57fd4247e876	Leo Dixit	rp1404patil@gmail.com	Data Engineer	Data & Analytics	ACTIVE	["Python", "SQL", "Apache Airflow", "ETL", "PostgreSQL"]	\N	2026-10-15 19:10:09.309036	2026-10-15 19:10:09.309053
58fa1c51-e7e3-4741-bef7-c9c27e715b12	Nova Burgous	rahulpadmakarpatil1404@gmail.com	AI/ML Engineer	Artificial Intelligence	ACTIVE	["Python", "Machine Learning", "NLP", "TensorFlow", "Data Analysis"]	\N	2026-10-15 19:12:01.186006	2026-10-15 19:12:01.186015
\.


--
-- Data for Name: handover_audit_logs; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.handover_audit_logs (id, handover_id, admin_id, action, previous_status, new_status, reason, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: handovers; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.handovers (id, employee_id, project_id, status, generated_summary, knowledge_package, recommended_successor_id, risk_summary, recipient_email, sent_at, created_at, updated_at) FROM stdin;
edf98f4d-0a46-4350-896e-31889a160cb0	bd3223ae-9770-4e0f-ae0b-8351842332b1	\N	READY_FOR_REVIEW	Knowledge continuity handover package for Shivay Oberoi (Senior backend developer). Primary knowledge owner for All Assigned Projects.	{"summary": "Knowledge continuity handover package for Shivay Oberoi (Senior backend developer). Primary knowledge owner for All Assigned Projects.", "contributions": ["Maintained core architecture for All Assigned Projects"], "projects": ["All Assigned Projects"], "github_work": [], "jira_responsibilities": [], "drive_knowledge": [], "notion_knowledge": [], "critical_knowledge": ["Core domain architecture of All Assigned Projects"], "open_tasks": ["Transfer repository access for All Assigned Projects"], "knowledge_gaps": ["Single point of knowledge concentration identified"], "risks": ["Bus factor risk for project All Assigned Projects"], "transfer_priorities": ["1. Pair programming walkthrough", "2. Handover documentation review", "3. Access transfer"], "recommended_successor": null}	\N	{}	rahulppatil1446@gmail.com	\N	2026-10-15 18:59:11.230256	2026-10-15 18:59:15.303302
\.


--
-- Data for Name: knowledge_chunks; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.knowledge_chunks (id, document_id, chunk_index, content, chunk_metadata, embedding_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: knowledge_documents; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.knowledge_documents (id, resource_id, employee_id, project_id, provider, external_id, title, content, content_hash, source_url, doc_metadata, last_synced_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.notifications (id, type, title, message, data, read, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_connections; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.oauth_connections (id, provider, connection_type, access_token_encrypted, refresh_token_encrypted, expires_at, scopes, provider_account_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.projects (id, name, description, status, created_at, updated_at) FROM stdin;
59ad174d-df27-433a-8046-c8eaa0f2d470	Atlas Migration	Priya Sharma	ACTIVE	2026-10-15 18:36:22.202518	2026-10-15 18:36:22.203279
\.


--
-- Data for Name: risk_scores; Type: TABLE DATA; Schema: public; Owner: continuum
--

COPY public.risk_scores (id, employee_id, project_id, knowledge_score, continuity_risk, bus_factor, risk_level, risk_reasons, calculated_at) FROM stdin;
11abd50e-ad01-460b-bff7-fbb118cd4964	\N	59ad174d-df27-433a-8046-c8eaa0f2d470	0	90	0	CRITICAL	["Project has 0 assigned team members", "No knowledge continuity owner identified"]	2026-10-15 18:36:22.464906
\.


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: employee_projects employee_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employee_projects
    ADD CONSTRAINT employee_projects_pkey PRIMARY KEY (employee_id, project_id);


--
-- Name: employee_resources employee_resources_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employee_resources
    ADD CONSTRAINT employee_resources_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: handover_audit_logs handover_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handover_audit_logs
    ADD CONSTRAINT handover_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: handovers handovers_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_documents knowledge_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_connections oauth_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.oauth_connections
    ADD CONSTRAINT oauth_connections_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: risk_scores risk_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT risk_scores_pkey PRIMARY KEY (id);


--
-- Name: ix_admins_email; Type: INDEX; Schema: public; Owner: continuum
--

CREATE UNIQUE INDEX ix_admins_email ON public.admins USING btree (email);


--
-- Name: ix_admins_supabase_user_id; Type: INDEX; Schema: public; Owner: continuum
--

CREATE UNIQUE INDEX ix_admins_supabase_user_id ON public.admins USING btree (supabase_user_id);


--
-- Name: ix_employees_email; Type: INDEX; Schema: public; Owner: continuum
--

CREATE UNIQUE INDEX ix_employees_email ON public.employees USING btree (email);


--
-- Name: ix_knowledge_chunks_embedding_id; Type: INDEX; Schema: public; Owner: continuum
--

CREATE INDEX ix_knowledge_chunks_embedding_id ON public.knowledge_chunks USING btree (embedding_id);


--
-- Name: ix_knowledge_documents_content_hash; Type: INDEX; Schema: public; Owner: continuum
--

CREATE INDEX ix_knowledge_documents_content_hash ON public.knowledge_documents USING btree (content_hash);


--
-- Name: employee_projects employee_projects_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employee_projects
    ADD CONSTRAINT employee_projects_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employee_projects employee_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employee_projects
    ADD CONSTRAINT employee_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: employee_resources employee_resources_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employee_resources
    ADD CONSTRAINT employee_resources_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: employee_resources employee_resources_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.employee_resources
    ADD CONSTRAINT employee_resources_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: handover_audit_logs handover_audit_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handover_audit_logs
    ADD CONSTRAINT handover_audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- Name: handover_audit_logs handover_audit_logs_handover_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handover_audit_logs
    ADD CONSTRAINT handover_audit_logs_handover_id_fkey FOREIGN KEY (handover_id) REFERENCES public.handovers(id) ON DELETE CASCADE;


--
-- Name: handovers handovers_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: handovers handovers_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: handovers handovers_recommended_successor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.handovers
    ADD CONSTRAINT handovers_recommended_successor_id_fkey FOREIGN KEY (recommended_successor_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: knowledge_chunks knowledge_chunks_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.knowledge_documents(id) ON DELETE CASCADE;


--
-- Name: knowledge_documents knowledge_documents_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: knowledge_documents knowledge_documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: knowledge_documents knowledge_documents_resource_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.knowledge_documents
    ADD CONSTRAINT knowledge_documents_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES public.employee_resources(id) ON DELETE SET NULL;


--
-- Name: risk_scores risk_scores_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT risk_scores_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: risk_scores risk_scores_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: continuum
--

ALTER TABLE ONLY public.risk_scores
    ADD CONSTRAINT risk_scores_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict b5HKNpIjZMsb5ocjsmuMh6ccH4hCU6X2EbwTdN9nw3JMeobvvohaJ92m9fXE16T

