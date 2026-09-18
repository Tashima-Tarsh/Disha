create schema if not exists extensions;

create extension if not exists vector with schema extensions;
create extension if not exists postgis with schema extensions;
