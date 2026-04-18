
-- Helper for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- CHANNELS
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  platform TEXT NOT NULL,
  link TEXT,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "channels_all" ON public.channels FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_channels_u BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PIPELINE
CREATE TABLE public.pipeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT,
  platform TEXT,
  idea TEXT NOT NULL,
  pillar TEXT,
  format TEXT,
  hook TEXT,
  status TEXT NOT NULL DEFAULT 'Idea',
  posted_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_all" ON public.pipeline FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_pipeline_u BEFORE UPDATE ON public.pipeline FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- POSTS (performance)
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT,
  platform TEXT,
  post_link TEXT,
  content_type TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_all" ON public.posts FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_posts_u BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GROWTH
CREATE TABLE public.growth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  channel TEXT,
  platform TEXT,
  followers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.growth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "growth_all" ON public.growth FOR ALL USING (true) WITH CHECK (true);

-- IDEAS
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT,
  channel TEXT,
  idea TEXT NOT NULL,
  hook TEXT,
  content_type TEXT,
  status TEXT NOT NULL DEFAULT 'Raw',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ideas_all" ON public.ideas FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ideas_u BEFORE UPDATE ON public.ideas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REPURPOSING
CREATE TABLE public.repurposing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post TEXT NOT NULL,
  source_platform TEXT,
  new_format TEXT,
  target_platform TEXT,
  status TEXT NOT NULL DEFAULT 'Planned',
  link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.repurposing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repurposing_all" ON public.repurposing FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_repurposing_u BEFORE UPDATE ON public.repurposing FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CALENDAR
CREATE TABLE public.calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  channel TEXT,
  platform TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Planned',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calendar_all" ON public.calendar FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_calendar_u BEFORE UPDATE ON public.calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed channels from upload
INSERT INTO public.channels (category, brand, platform, link) VALUES
('Finance','MarketMakers','Telegram','https://t.me/+o6lVGV0FD5U4NWZk'),
('Finance','MarketMakers','X (Twitter)','https://x.com/FinanceFightR'),
('Finance','MarketMakers','Blog','https://financefightr.blogspot.com/'),
('Finance','MarketMakers','YouTube','https://youtube.com/@FinanceFightR'),
('Community','WatuWaWatu','Telegram','https://t.me/+yx9CoCh7qWYwMDJk'),
('Community','WatuWaWatu','Blog','https://watuwawatu.blogspot.com/'),
('Music','RythmRhymRealm','Telegram','https://t.me/+PYAUrlvf03M0NGU0'),
('Music','RythmRhymRealm','Blog','https://epicinink.blogspot.com/'),
('Writing','InkIntrigue','Telegram','https://t.me/+Ca68yDJ2Im8wYzg0'),
('Tech','CyberSpace','Telegram','https://t.me/+0GDoTYnA0GwwMGZk');
