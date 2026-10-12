-- ============================================
-- Salon Trač — init.sql
-- Inicijalizacija baze podataka
-- Encoding: UTF-8
-- ============================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ============================================
-- TABELE
-- ============================================

CREATE TABLE IF NOT EXISTS public.admins (
    id integer NOT NULL,
    username character varying(100) NOT NULL,
    password character varying(255) NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.admins_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;
ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


CREATE TABLE IF NOT EXISTS public.settings (
    id integer NOT NULL,
    name character varying(200) DEFAULT 'Salon Trač' NOT NULL,
    description text,
    working_hours character varying(200),
    discount_until date
);

CREATE SEQUENCE IF NOT EXISTS public.settings_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;
ALTER TABLE ONLY public.settings ALTER COLUMN id SET DEFAULT nextval('public.settings_id_seq'::regclass);


CREATE TABLE IF NOT EXISTS public.allowed_currencies (
    code character(3) NOT NULL
);


CREATE TABLE IF NOT EXISTS public.salon_hours (
    day_of_week smallint NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    is_closed boolean DEFAULT false NOT NULL
);

/*tabela kategorija*/
CREATE TABLE IF NOT EXISTS public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.categories_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;
ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);

/*tabela usluga*/
CREATE TABLE IF NOT EXISTS public.services (
    id integer NOT NULL,
    category_id integer,
    name character varying(200) NOT NULL,
    description text,
    duration_minutes integer DEFAULT 30 NOT NULL,
    price_rsd numeric(10,2) NOT NULL,
    max_clients integer DEFAULT 1 NOT NULL,
    slot_start time without time zone,
    slot_end time without time zone
);

CREATE SEQUENCE IF NOT EXISTS public.services_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;
ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


CREATE TABLE IF NOT EXISTS public.reservations (
    id integer NOT NULL,
    access_code character(8) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    phone character varying(50),
    address1 character varying(200) NOT NULL,
    postal_code character varying(20) NOT NULL,
    city character varying(100) NOT NULL,
    country character varying(100) NOT NULL,
    currency character(3) DEFAULT 'RSD' NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'active' NOT NULL,
    promo_code character varying(50),
    promo_code_used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.reservations_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.reservations_id_seq OWNED BY public.reservations.id;
ALTER TABLE ONLY public.reservations ALTER COLUMN id SET DEFAULT nextval('public.reservations_id_seq'::regclass);


CREATE TABLE IF NOT EXISTS public.reservation_items (
    id integer NOT NULL,
    reservation_id integer,
    service_id integer,
    date date NOT NULL,
    "time" time without time zone NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    line_total numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS public.reservation_items_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.reservation_items_id_seq OWNED BY public.reservation_items.id;
ALTER TABLE ONLY public.reservation_items ALTER COLUMN id SET DEFAULT nextval('public.reservation_items_id_seq'::regclass);


-- ============================================
-- PRIMARY KEYS & CONSTRAINTS
-- ============================================

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.allowed_currencies
    ADD CONSTRAINT allowed_currencies_pkey PRIMARY KEY (code);

ALTER TABLE ONLY public.salon_hours
    ADD CONSTRAINT salon_hours_pkey PRIMARY KEY (day_of_week);

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reservations
    ADD CONSTRAINT reservations_access_code_key UNIQUE (access_code);

ALTER TABLE ONLY public.reservation_items
    ADD CONSTRAINT reservation_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.reservation_items
    ADD CONSTRAINT reservation_items_reservation_id_fkey
    FOREIGN KEY (reservation_id) REFERENCES public.reservations(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.reservation_items
    ADD CONSTRAINT reservation_items_service_id_fkey
    FOREIGN KEY (service_id) REFERENCES public.services(id);

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey
    FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


-- ============================================
-- PODACI
-- ============================================

INSERT INTO public.admins (id, username, password) VALUES (1, 'admin', 'admin123')
    ON CONFLICT DO NOTHING;

INSERT INTO public.settings (id, name, description, working_hours, discount_until)
VALUES (
    1,
    'Salon Trač',
    'Dobro došla u Salon Trač — mesto gde se lepota susreće sa opuštanjem.',
    'Pon–Pet: 09:00–20:00 | Sub: 09:00–16:00 | Ned: zatvoreno',
    NULL
) ON CONFLICT DO NOTHING;

INSERT INTO public.allowed_currencies (code) VALUES ('RSD'), ('EUR')
    ON CONFLICT DO NOTHING;

INSERT INTO public.salon_hours (day_of_week, open_time, close_time, is_closed) VALUES
    (0, NULL,       NULL,       true),
    (1, '09:00:00', '20:00:00', false),
    (2, '09:00:00', '20:00:00', false),
    (3, '09:00:00', '20:00:00', false),
    (4, '09:00:00', '20:00:00', false),
    (5, '09:00:00', '20:00:00', false),
    (6, '09:00:00', '16:00:00', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.categories (id, name) VALUES
    (1, 'Šišanje'),
    (2, 'Manikir'),
    (3, 'Pedikir'),
    (4, 'Masaže'),
    (5, 'Feniranje'),
    (6, 'Tretmani lica'),
    (7, 'Šminkanje')
ON CONFLICT DO NOTHING;

INSERT INTO public.services (id, category_id, name, description, duration_minutes, price_rsd, max_clients, slot_start, slot_end) VALUES
    (1,  1, 'Šišanje duge kose',                  'Šišanje duge kose',                        30,  1200.00, 1, '09:00:00', '19:00:00'),
    (2,  1, 'Šišanje sa pranjem',                 'Šišanje uz pranje kose',                   45,  1800.00, 1, '09:00:00', '19:00:00'),
    (3,  2, 'Klasični manikir',                   'Uređivanje i klasični lak',                40,  1400.00, 2, '09:00:00', '19:00:00'),
    (4,  2, 'Gel lak manikir',                    'Trajni gel lak — trajnost 3 nedelje',      60,  2000.00, 2, '09:00:00', '19:00:00'),
    (5,  3, 'Klasični pedikir',                   'Uređivanje i klasični lak na nogama',      60,  2000.00, 2, '09:00:00', '18:00:00'),
    (6,  3, 'Spa pedikir',                        'Opuštajući spa pedikir tretman',           75,  2600.00, 2, '09:00:00', '17:00:00'),
    (7,  4, 'Relaks masaža celog tela',           'Opuštajuća masaža celog tela',             60,  3000.00, 1, '09:00:00', '18:00:00'),
    (8,  4, 'Parcijalna masaža leđa i vrata',     'Masaža leđa i vrata',                      30,  1800.00, 1, '09:00:00', '19:00:00'),
    (9,  5, 'Feniranje kratke kose',              'Profesionalno feniranje kratke kose',      30,  1000.00, 3, '09:00:00', '19:00:00'),
    (10, 5, 'Feniranje duge kose',                'Profesionalno feniranje duge kose',        40,  1400.00, 2, '09:00:00', '19:00:00'),
    (11, 6, 'Osnovni tretman čišćenja lica',      'Dubinsko čišćenje lica',                   60,  2500.00, 1, '09:00:00', '18:00:00'),
    (12, 6, 'Hidratantni tretman lica',           'Intenzivna hidratacija lica',              50,  2300.00, 1, '09:00:00', '18:00:00'),
    (13, 7, 'Dnevna šminka',                      'Prirodna dnevna šminka',                   45,  2200.00, 2, '09:00:00', '19:00:00'),
    (14, 7, 'Profesionalna večernja šminka',      'Glamurozna večernja šminka',               60,  3000.00, 2, '09:00:00', '18:00:00')
ON CONFLICT DO NOTHING;

-- Resetuj sekvence
SELECT pg_catalog.setval('public.admins_id_seq', 1, true);
SELECT pg_catalog.setval('public.categories_id_seq', 7, true);
SELECT pg_catalog.setval('public.services_id_seq', 14, true);
SELECT pg_catalog.setval('public.settings_id_seq', 1, true);
SELECT pg_catalog.setval('public.reservations_id_seq', 1, false);
SELECT pg_catalog.setval('public.reservation_items_id_seq', 1, false);
