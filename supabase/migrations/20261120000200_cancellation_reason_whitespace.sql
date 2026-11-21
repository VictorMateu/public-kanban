BEGIN;

-- Match JavaScript String.trim whitespace, including BOM, for direct database writes.
ALTER TABLE public.projects
  DROP CONSTRAINT projects_cancelled_reason_required,
  ADD CONSTRAINT projects_cancelled_reason_required CHECK (
    status <> 'cancelled' OR (
      cancellation_reason IS NOT NULL
      AND btrim(cancellation_reason,
        U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
      ) <> ''
    )
  );

COMMIT;
