-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Foods table
create table foods (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  portion_size text not null,
  protein numeric(5,1) not null check (protein >= 0),
  carbs numeric(5,1) not null check (carbs >= 0),
  fat numeric(5,1) not null check (fat >= 0),
  frequency integer not null default 0 check (frequency >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Daily entries table
create table daily_entries (
  id uuid default uuid_generate_v4() primary key,
  date date not null unique,
  day_type text not null check (day_type in ('workout', 'rest')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Food entries table (historical preservation)
create table food_entries (
  id uuid default uuid_generate_v4() primary key,
  daily_entry_id uuid references daily_entries(id) on delete cascade not null,
  food_id uuid references foods(id) on delete cascade not null,
  multiplier numeric(4,2) not null default 1.00 check (multiplier > 0),
  -- Snapshot of food data for historical preservation
  food_name text not null,
  food_portion_size text not null,
  food_protein numeric(5,1) not null check (food_protein >= 0),
  food_carbs numeric(5,1) not null check (food_carbs >= 0),
  food_fat numeric(5,1) not null check (food_fat >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- User settings table
create table user_settings (
  id uuid default uuid_generate_v4() primary key,
  workout_protein integer not null check (workout_protein > 0),
  workout_carbs integer not null check (workout_carbs > 0),
  workout_fat integer not null check (workout_fat > 0),
  rest_protein integer not null check (rest_protein > 0),
  rest_carbs integer not null check (rest_carbs > 0),
  rest_fat integer not null check (rest_fat > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Function to increment food frequency
create or replace function increment_food_frequency(food_id uuid)
returns void as $$
begin
  update foods
  set frequency = frequency + 1,
      updated_at = timezone('utc'::text, now())
  where id = food_id;
end;
$$ language plpgsql;

-- Indexes for better performance
create index idx_foods_frequency on foods(frequency desc);
create index idx_daily_entries_date on daily_entries(date);
create index idx_food_entries_daily_entry_id on food_entries(daily_entry_id);
create index idx_food_entries_food_id on food_entries(food_id);

-- Update triggers for updated_at timestamps
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_foods_updated_at before update on foods
    for each row execute procedure update_updated_at_column();

create trigger update_daily_entries_updated_at before update on daily_entries
    for each row execute procedure update_updated_at_column();

create trigger update_food_entries_updated_at before update on food_entries
    for each row execute procedure update_updated_at_column();

create trigger update_user_settings_updated_at before update on user_settings
    for each row execute procedure update_updated_at_column();

-- Row Level Security (RLS) - for future multi-user support
alter table foods enable row level security;
alter table daily_entries enable row level security;
alter table food_entries enable row level security;
alter table user_settings enable row level security;

-- For now, allow all operations (single user)
create policy "Allow all operations" on foods for all using (true);
create policy "Allow all operations" on daily_entries for all using (true);
create policy "Allow all operations" on food_entries for all using (true);
create policy "Allow all operations" on user_settings for all using (true);