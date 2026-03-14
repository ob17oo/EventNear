# Реализация функции города - Код-ревью и обратная связь

**Отзыв от:** Senior React Frontend Engineer (опыт в BigTech)  
**Дата:** 14 марта 2026  
**Область:** Связи в БД, функция смены города и все связанные компоненты

---

## Резюме

Ваша реализация города следует **базовому, но функциональному паттерну**. Основная схема БД звучит, но есть несколько **критических архитектурных и UX проблем**, которые вызовут проблемы в production:

1. **Риск целостности данных** - ограничения БД могут вызвать каскадные сбои
2. **События не фильтруются по городу** - пользователь не видит релевантные события
3. **Плохой UX** - нет состояний загрузки, обработки ошибок или оптимистичных обновлений
4. **Проблема производительности** - города загружаются при каждом рендере layout
5. **Пробелы валидации** - нет проверок существования города перед обновлением

**Итоговая оценка: C+ (Функционально, но нужно усилить для production)**

---

## 🔴 Critical Issues (Fix Immediately)

### Issue 1: Events Not Filtered by City
**Severity:** CRITICAL  
**Location:** `src/app/(main)/(home)/page.tsx` + `src/entities/event/api/getiEvents.api.ts`

**Problem:**
```tsx
// Currently: Loads ALL events regardless of user's city
const events = await getAllEvents()

// getAllEvents() has no city filter:
export async function getAllEvents() {
    const events = await prisma.event.findMany()
    return events
}
```

When a user changes city, the UI updates, but they still see all events globally. This defeats the purpose of the city selector.

**Solution:**

**Step 1:** Update the event API to accept city parameter:
```typescript
// src/entities/event/api/getiEvents.api.ts
import { prisma } from "@/shared/lib"

export async function getAllEvents(cityId?: string) {
    try {
        const events = await prisma.event.findMany({
            where: cityId ? { cityId } : undefined,
            orderBy: {
                date: 'asc'
            }
        })
        return events
    } catch(error: unknown) {
        if(process.env.NODE_ENV === 'development') {
            console.log(error)
        }
        throw new Error(`Error fetching events: ${error}`)
    }
}
```

**Step 2:** Update home page to pass user's city:
```typescript
// src/app/(main)/(home)/page.tsx
import { getAllEvents } from "@/entities/event/api";
import { authOption } from "@/shared/lib/auth";
import { HomePage } from "@/view";
import { getServerSession } from "next-auth";

export default async function Home(){
  const session = await getServerSession(authOption)
  const cityId = session?.user.cityId
  const events = await getAllEvents(cityId)
  return <HomePage events={events}/>
}
```

**Impact:** ✅ Users now see only events in their selected city

---

### Issue 2: Missing Loading & Error States in CityDialogComp
**Severity:** CRITICAL  
**Location:** `src/widgets/CityComp/ui/index.tsx`

**Problem:**
```tsx
const [isUpdatingUser, setIsUpdatingUser] = useState(false) // ← Declared but NEVER USED

const handleChangeCity = async (selectedCity: string) => {
    // No loading indicator for user
    // No error feedback on failure
    // User doesn't know what's happening
    setIsUpdatingUser(true)
    
    const resp = await updateUserCity({...})
    
    // isUpdatingUser is never set back to false!
    // Typo in error message: "Eror" instead of "Error"
}
```

**Solution:**

```tsx
'use client'
import { TUserCity } from "@/entities/city/model/city.types"
import { updateUserCity } from "@/entities/user/lib";
import { InputComp } from "@/shared/ui";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTransition } from "react";

interface CityPopUpProps {
    isOpen: boolean,
    onClose: () => void,
    city: TUserCity[],
    userCity: TUserCity;
}

export function CityDialogComp({isOpen, onClose, city, userCity}: CityPopUpProps){
    const router = useRouter()
    const {data: session, update} = useSession()
    const [search, setSearch] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition() // ← Use React 18 useTransition
    
    const filteredCity = useMemo(() => {
        if(!search.trim()) return city
        return city.filter((el) => el.name.toLowerCase().includes(search.toLowerCase()))
    },[city, search])

    if(!session || !isOpen){
        return null
    }
    
    const handleChangeCity = async (selectedCity: string) => {
        if(selectedCity === userCity.id){
            onClose()
            return
        }

        setError(null) // ← Clear previous errors
        
        startTransition(async () => {
            try {
                const resp = await updateUserCity({
                    newCityId: selectedCity,
                    userId: session.user.id
                })

                if(resp?.success){
                    await update()
                    onClose()
                    router.refresh()
                }
            } catch(error: unknown){
                const errorMsg = error instanceof Error ? error.message : 'Failed to change city'
                setError(errorMsg)
                console.error(`Error updating user data:`, error)
            }
        })
    }

    return (
        <section className="w-full h-screen fixed inset-0 z-20 bg-black/30" onClick={onClose}>
            <div className="w-full h-full flex items-center justify-center">
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="rounded-2xl min-w-20 w-80 px-4 pt-8 pb-4 bg-gray-100 flex flex-col gap-3 relative"
                >
                    <button 
                        onClick={onClose} 
                        className="absolute top-2 right-2 cursor-pointer disabled:opacity-50" 
                        type="button"
                        disabled={isPending} // ← Disable close while updating
                    >
                        <Image width={28} height={28} src={'/static/icons/close-cross_accent.svg'} alt="CloseCity"/>
                    </button>
                    
                    <div className="flex items-center gap-1">
                        <Image width={28} height={28} src={'/static/icons/map-location_accent.svg'} alt="UserCityPointer"/>
                        <p className="text-lg">{userCity.name}</p>
                    </div>
                    
                    <InputComp 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                        label='Поиск города'
                        disabled={isPending} // ← Disable input while updating
                    />
                    
                    {/* Error message */}
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex flex-col gap-3 h-80 overflow-scroll">
                        {filteredCity.length === 0 ? (
                            <p className="text-center text-gray-600 py-4">Город не найден</p>
                        ) : (
                            filteredCity.map((el) => (
                                <button 
                                    onClick={() => handleChangeCity(el.id)} 
                                    className={`text-lg text-left cursor-pointer py-2 px-2 rounded transition-colors ${
                                        el.id === userCity.id 
                                            ? 'bg-blue-200 font-semibold' 
                                            : 'hover:bg-gray-200'
                                    } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    key={el.id} 
                                    type="button"
                                    disabled={isPending} // ← Disable buttons while updating
                                >
                                    {isPending ? '⏳ Обновление...' : el.name}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}
```

**Why `useTransition` instead of manual state?**
- Automatically manages pending state
- Integrates with Server Actions
- Prevents double-submissions
- Better UX with automatic state management

**Impact:** ✅ Users get clear feedback, loading states, and error messages

---

### Issue 3: No Validation of City Existence
**Severity:** HIGH  
**Location:** `src/entities/user/lib/updateUser.hooks.ts`

**Problem:**
```typescript
export async function updateUserCity({newCityId, userId}: updateUserCityProps){
    // ✗ NEVER checks if this city actually exists
    // ✗ Could update user to non-existent city
    // ✗ Vulnerable to passing random IDs
    const updateUser = await prisma.user.update({
        where: { id: userId },
        data: { cityId: newCityId }
    })
}
```

**Solution:**

```typescript
// src/entities/user/lib/updateUser.hooks.ts
'use server'
import { prisma } from "@/shared/lib";

interface UpdateUserCityProps {
    newCityId: string,
    userId: string
}

export async function updateUserCity({ newCityId, userId }: UpdateUserCityProps) {
    try {
        // Step 1: Validate city exists
        const cityExists = await prisma.city.findUnique({
            where: { id: newCityId },
            select: { id: true } // ← Only select ID for performance
        })

        if (!cityExists) {
            throw new Error('CITY_NOT_FOUND')
        }

        // Step 2: Update user with validated city
        const updateUser = await prisma.user.update({
            where: { id: userId },
            data: { cityId: newCityId },
            select: {
                id: true,
                cityId: true,
                city: true
            }
        })

        if (updateUser) {
            return { success: true, city: updateUser.city }
        }

        throw new Error('UPDATE_FAILED')
    } catch(error: unknown) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Error updating user city:', error)
        }

        if (error instanceof Error) {
            if (error.message === 'CITY_NOT_FOUND') {
                throw new Error('Выбранный город не существует')
            }
            if (error.message.includes('User')) {
                throw new Error('Пользователь не найден')
            }
        }

        throw new Error('Ошибка при смене города. Попробуйте еще раз.')
    }
}
```

**Impact:** ✅ Prevents invalid data, improves security

---

## 🟡 Major Issues (Fix Soon)

### Issue 4: Database Constraint Risk - ON DELETE RESTRICT
**Severity:** MAJOR  
**Location:** `prisma/migrations/20260308092251_add_city_table_and_make_references_to_user_and_event_tables/migration.sql`

**Problem:**
```sql
ALTER TABLE "events" ADD CONSTRAINT "events_cityId_fkey" 
  FOREIGN KEY ("cityId") REFERENCES "City"("id") 
  ON DELETE RESTRICT -- ← PROBLEM: Can't delete city if events exist
  ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_cityId_fkey" 
  FOREIGN KEY ("cityId") REFERENCES "City"("id") 
  ON DELETE RESTRICT -- ← PROBLEM: Can't delete city if users exist
  ON UPDATE CASCADE;
```

**Scenario:**
```typescript
// Admin tries to delete a city with events
await prisma.city.delete({ where: { id: cityId } })
// → ERROR: "Violates foreign key constraint"
// → Cannot delete even if intended
```

**Solution - Create a new migration:**

```sql
-- NEW MIGRATION: prisma/migrations/xxxx_fix_city_delete_constraints/migration.sql

-- Drop old constraints
ALTER TABLE "events" DROP CONSTRAINT "events_cityId_fkey";
ALTER TABLE "User" DROP CONSTRAINT "User_cityId_fkey";

-- Add new constraints with CASCADE (delete all events/users when city deleted)
-- OR SET NULL (if you want to preserve records)

-- Option A: CASCADE DELETE (recommended if city is rarely deleted)
ALTER TABLE "events" ADD CONSTRAINT "events_cityId_fkey" 
  FOREIGN KEY ("cityId") REFERENCES "City"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_cityId_fkey" 
  FOREIGN KEY ("cityId") REFERENCES "City"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Option B: SET NULL (preserve records, orphan them)
-- require: ALTER TABLE events ALTER COLUMN cityId DROP NOT NULL;
-- require: ALTER TABLE "User" ALTER COLUMN cityId DROP NOT NULL;
-- Then:
-- ALTER TABLE "events" ADD CONSTRAINT "events_cityId_fkey" 
--   FOREIGN KEY ("cityId") REFERENCES "City"("id") 
--   ON DELETE SET NULL 
--   ON UPDATE CASCADE;
```

**Apply migration:**
```bash
npx prisma migrate dev --name fix_city_delete_constraints
```

**Impact:** ✅ Database operations won't fail unexpectedly

---

### Issue 5: Cities Loaded on Every Layout Render
**Severity:** MAJOR  
**Location:** `src/app/(main)/layout.tsx`

**Problem:**
```typescript
export default async function RootLayout({ children }: ...) {
    const session = await getServerSession(authOption)
    const city = await getAllCities() // ← Runs on EVERY page load/navigation

    return (
        <>
            <HeaderComp city={city} session={session}/>
            <Category />
            {children}
        </>
    )
}
```

Cities rarely change in production. Loading them every time is wasteful.

**Solution:**

**Step 1:** Create a city cache utility:
```typescript
// src/entities/city/api/cityCache.ts
import { prisma } from "@/shared/lib"

const CACHE_KEY = 'cities_cache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour in milliseconds

interface CacheData {
    cities: Array<{ id: string; name: string }>
    timestamp: number
}

let cachedData: CacheData | null = null

export async function getCitiesWithCache() {
    const now = Date.now()
    
    // Return cached data if still valid
    if (cachedData && (now - cachedData.timestamp) < CACHE_TTL) {
        return cachedData.cities
    }

    try {
        const cities = await prisma.city.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })

        cachedData = { cities, timestamp: now }
        return cities
    } catch(error: unknown) {
        console.error('Error fetching cities:', error)
        // Return stale cache if available, otherwise throw
        if (cachedData) {
            return cachedData.cities
        }
        throw new Error('Failed to fetch cities')
    }
}

// For use when you need to invalidate cache (after city changes)
export function invalidateCitiesCache() {
    cachedData = null
}
```

**Step 2:** Update layout to use cache:
```typescript
// src/app/(main)/layout.tsx
import { getCitiesWithCache } from "@/entities/city/api/cityCache"
import { authOption } from "@/shared/lib/auth"
import { Category, HeaderComp } from "@/widgets"
import { getServerSession } from "next-auth"

export default async function RootLayout({ children }: ...) {
    const [session, cities] = await Promise.all([
        getServerSession(authOption),
        getCitiesWithCache()
    ])

    return (
        <>
            <HeaderComp city={cities} session={session}/>
            <Category />
            {children}
        </>
    )
}
```

**Step 3:** Invalidate cache when cities change:
```typescript
// src/entities/city/api/index.ts
export { getCitiesWithCache } from './cityCache'
export { invalidateCitiesCache } from './cityCache'
export { getAllEvents } from './getiEvents.api'
```

**Impact:** ✅ Reduced database queries, better performance

---

## 🟢 Good Practices (Keep These)

### ✅ Proper Session Update Pattern
```tsx
// This is correct!
const resp = await updateUserCity({...})
if(resp?.success){
    await update() // ← Refreshes session
    onClose()
    router.refresh() // ← Refreshes server components
}
```

### ✅ Good Database Schema Structure
- Proper foreign keys
- Indexes on frequently filtered columns (cityId)
- Unique constraint on city name

### ✅ Separation of Concerns
- API layer separate from UI
- Server actions properly marked
- Clean component structure

---

## 🟡 Medium Issues (Fix Next Sprint)

### Issue 6: No Optimistic UI Updates
**Severity:** MEDIUM  
**Location:** `src/widgets/CityComp/ui/index.tsx`

**Problem:**
User clicks city → waits for server → UI updates. Feels slow.

**Solution:**
```tsx
const handleChangeCity = (selectedCity: string) => {
    if(selectedCity === userCity.id) {
        onClose()
        return
    }

    setError(null)
    
    // Optimistic update: update UI immediately
    const previousCity = userCity
    setLocalCity({ id: selectedCity, name: filteredCity.find(c => c.id === selectedCity)?.name || '' })
    
    startTransition(async () => {
        try {
            const resp = await updateUserCity({
                newCityId: selectedCity,
                userId: session.user.id
            })

            if(resp?.success){
                await update()
                onClose()
                router.refresh()
            } else {
                // Revert on failure
                setLocalCity(previousCity)
                setError('Failed to change city')
            }
        } catch(error: unknown){
            // Revert on failure
            setLocalCity(previousCity)
            setError(error instanceof Error ? error.message : 'Failed to change city')
        }
    })
}
```

### Issue 7: Missing Accessibility Features
**Severity:** MEDIUM  
**Current:** Dialog has no ARIA labels
**Solution:**
```tsx
<section 
    className="w-full h-screen fixed inset-0 z-20 bg-black/30" 
    onClick={onClose}
    role="presentation"
>
    <div 
        className="w-full h-full flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="city-dialog-title"
    >
        <div ...>
            <h2 id="city-dialog-title" className="sr-only">Select City</h2>
            {/* ... */}
        </div>
    </div>
</section>
```

### Issue 8: No Keyboard Navigation
**Severity:** MEDIUM  
**Problem:** Can't close modal with Escape key, can't arrow navigate cities

**Solution:**
```tsx
useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    if (isOpen) {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }
}, [isOpen, onClose])
```

---

## 📋 Performance Recommendations

### Issue 9: City List Never Uses Virtual Scrolling
**Severity:** LOW (but becomes critical with 1000+ cities)

If you scale to many cities:
```bash
npm install react-window
```

```tsx
import { FixedSizeList } from 'react-window'

<FixedSizeList
    height={300}
    itemCount={filteredCity.length}
    itemSize={45}
    width="100%"
>
    {({ index, style }) => (
        <button
            style={style}
            onClick={() => handleChangeCity(filteredCity[index].id)}
        >
            {filteredCity[index].name}
        </button>
    )}
</FixedSizeList>
```

---

## 📝 Database Improvements Checklist

```typescript
// src/prisma/schema/city.prisma - Add timestamps
model City {
    id String @id @default(cuid())
    name String @unique
    
    // Track changes
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")
    
    // Relationships
    events Event[]
    users User[]
    
    @@index([name])
    @@index([createdAt])
}
```

---

## 🔄 Implementation Priority

### Phase 1 (This Week) - CRITICAL
- [ ] Fix database constraints (Issue 4)
- [ ] Add city existence validation (Issue 3)
- [ ] Implement event filtering by city (Issue 1)
- [ ] Add loading/error states (Issue 2)

### Phase 2 (Next Week) - IMPORTANT
- [ ] Implement city caching (Issue 5)
- [ ] Add optimistic updates (Issue 6)
- [ ] Add accessibility (Issue 7)
- [ ] Add keyboard navigation (Issue 8)

### Phase 3 (Future) - NICE-TO-HAVE
- [ ] Virtual scrolling (Issue 9)
- [ ] Add city timestamps
- [ ] Advanced filtering/sorting

---

## 🎯 Summary of Changes

| Component | Current | Improved |
|-----------|---------|----------|
| Event Filtering | ✗ Shows all events globally | ✓ Shows city-specific events |
| Loading State | ✗ No feedback | ✓ Disabled buttons + loading text |
| Error Handling | ✗ Silent errors | ✓ User-facing error messages |
| Validation | ✗ No city validation | ✓ Validates city exists |
| Performance | ✗ Cities loaded every render | ✓ Cached for 1 hour |
| Accessibility | ✗ No ARIA labels | ✓ Full accessibility |
| DB Safety | ✗ ON DELETE RESTRICT | ✓ ON DELETE CASCADE |

---

## Questions for Your Team

1. **Should cities be cached?** (Memory vs fresh data tradeoff)
2. **What happens when a city is deleted?** (Cascade vs preserve records?)
3. **How many cities will you have?** (Affects virtual scrolling need)
4. **Do events have other filters** (genre, price, date) that should combine with city?
5. **Should city selection persist across sessions?** (Currently does via session)

---

## Code Quality Notes

**What's Good:**
- ✅ Clean server action usage
- ✅ Proper async/await patterns
- ✅ Good component separation

**What Needs Work:**
- ⚠️ Error messages have typos ("Eror")
- ⚠️ Unused state variables (isUpdatingUser)
- ⚠️ No request deduplication
- ⚠️ No fallback/skeleton loading for HeaderComp

---

**Next Steps:** Implement Phase 1 items, then schedule Phase 2 for following sprint.
