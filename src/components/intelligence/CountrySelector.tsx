import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useCountriesQuery } from '@/hooks/queries/useCountriesQuery';
import { CountryOption } from '@/utils/countries';
import { useTranslation } from 'react-i18next';

interface CountrySelectorProps {
  countryCodes: string[];
  setCountryCodes: (codes: string[]) => void;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({ countryCodes, setCountryCodes }) => {
  const { data: countries = [] } = useCountriesQuery();
  const { t } = useTranslation();
  const tAny = t as (key: string, options?: any) => string;
  const [countryFilter, setCountryFilter] = useState('');

  const filteredCountries = countries.filter(opt => !countryFilter || opt.name.toLowerCase().includes(countryFilter.toLowerCase()));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="glass">{tAny('countrySelector.button')}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-[30rem]">
      <div className="space-y-2">
        <input
          type="text"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          placeholder={tAny('countrySelector.searchPlaceholder')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="max-h-64 overflow-auto">
          <ul className="divide-y divide-border">
            <li
              className={`cursor-pointer rounded-sm px-2 py-2 text-sm ${countryCodes.length === 0 ? 'bg-accent font-semibold text-accent-foreground' : 'hover:bg-accent'}`}
              onClick={() => setCountryCodes([])}
            >
              {tAny('countrySelector.all')}
            </li>
            {filteredCountries.map((opt) => {
              const active = countryCodes.includes(opt.value);
              return (
                <li
                  key={opt.value}
                  className={`cursor-pointer rounded-sm px-2 py-2 text-sm ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                  onClick={() => {
                    const next = active ? countryCodes.filter(c => c !== opt.value) : [...countryCodes, opt.value];
                    setCountryCodes(next);
                  }}
                >
                  {opt.name}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </PopoverContent>
    </Popover>
  );
};
