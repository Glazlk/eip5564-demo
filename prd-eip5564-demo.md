# PRD: EIP-5564 Stealth Addresses — Interactive Visual Demo

## Introduction

Интерактивная веб-демонстрация алгоритма стелс-адресов по стандарту [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564), аналогичная [sha256algorithm.com](https://sha256algorithm.com/). Приложение визуализирует каждый шаг криптографического протокола — от генерации ключей до вычисления stealth private key и механизма Announcer-контракта. Пользователь может пошагово проходить алгоритм (вперёд/назад, автозапуск) или мгновенно видеть результат при изменении входных данных.

**Референс:** sha256algorithm.com — React + Tailwind, пошаговая визуализация SHA-256 с анимацией, переключением hex/bin/text, навигацией по шагам.

**Наш стек:** Vanilla TypeScript (без фреймворков), все вычисления в браузере.

## Goals

- Визуализировать полный цикл EIP-5564: генерация ключей → stealth-адрес → парсинг announcements → вычисление stealth private key → Announcer-контракт
- Предоставить два режима: пошаговая анимация и мгновенный пересчёт (live mode)
- Сделать приложение понятным для широкой аудитории — от студентов до разработчиков
- Все криптографические вычисления выполняются в браузере (JavaScript/WASM)
- Обеспечить отзывчивый desktop-first интерфейс

## User Stories

### US-001: Просмотр обзорной страницы протокола

**Description:** Как пользователь, я хочу видеть общую схему протокола EIP-5564, чтобы понять последовательность криптографических операций до погружения в детали.

**Acceptance Criteria:**
- [ ] На главной странице отображается интерактивная диаграмма полного цикла EIP-5564 с 4 фазами: Key Setup → Generate Stealth Address → Parse Announcements → Derive Stealth Key
- [ ] Каждая фаза диаграммы кликабельна и ведёт к детальной визуализации
- [ ] Диаграмма содержит краткие подписи к каждому этапу на английском языке
- [ ] Typecheck passes (`tsc --noEmit`)

### US-002: Генерация ключей (Key Setup)

**Description:** Как пользователь, я хочу сгенерировать или ввести ключи участников (spending key, viewing key), чтобы увидеть, как формируются публичные ключи и stealth meta-address.

**Acceptance Criteria:**
- [ ] Пользователь может сгенерировать случайную пару ключей кнопкой "Generate"
- [ ] Пользователь может ввести свои приватные ключи вручную (hex input)
- [ ] Визуализируется: `p_spend` → `P_spend = p_spend · G`, `p_view` → `P_view = p_view · G`
- [ ] Отображается результирующий stealth meta-address в формате `st:eth:0x<P_spend><P_view>`
- [ ] Значения отображаются в hex с возможностью переключения на decimal
- [ ] Typecheck passes

### US-003: Пошаговая генерация stealth-адреса

**Description:** Как пользователь, я хочу пошагово видеть, как sender генерирует stealth-адрес из stealth meta-address, чтобы понять каждую криптографическую операцию.

**Acceptance Criteria:**
- [ ] Визуализируются следующие шаги с промежуточными значениями:
  1. Генерация ephemeral private key `p_ephemeral` (random 32 bytes)
  2. Вычисление ephemeral public key `P_ephemeral = p_ephemeral · G`
  3. Парсинг `P_spend` и `P_view` из stealth meta-address
  4. Вычисление shared secret `s = p_ephemeral · P_view` (ECDH)
  5. Хеширование `s_h = hash(s)`
  6. Извлечение view tag `v = s_h[0]` (первый байт)
  7. Вычисление `S_h = s_h · G` (point multiplication)
  8. Вычисление stealth public key `P_stealth = P_spend + S_h` (point addition)
  9. Вычисление stealth address `a_stealth = pubkeyToAddress(P_stealth)`
- [ ] Навигация: кнопки ◀ (назад), ▶ (вперёд), ▶▶ (авто), ⏮ (начало), ⏭ (конец)
- [ ] Текущий шаг подсвечивается, предыдущие затемняются
- [ ] На каждом шаге отображается формула и краткое текстовое пояснение
- [ ] Typecheck passes

### US-004: Live-режим (мгновенный пересчёт)

**Description:** Как пользователь, я хочу мгновенно видеть результат при изменении входных данных, без необходимости проходить шаги.

**Acceptance Criteria:**
- [ ] Переключатель "Step-by-step / Live" в шапке секции
- [ ] В live-режиме все промежуточные значения и результат обновляются мгновенно при изменении любого входного параметра
- [ ] При изменении значения подсвечиваются изменившиеся поля (короткая анимация highlight)
- [ ] Typecheck passes

### US-005: Парсинг Announcements (Check Stealth Address)

**Description:** Как получатель, я хочу пошагово видеть, как проверяется принадлежность stealth-адреса, чтобы понять процесс парсинга.

**Acceptance Criteria:**
- [ ] Визуализируются шаги `checkStealthAddress`:
  1. Вычисление shared secret `s = p_view · P_ephemeral`
  2. Хеширование `s_h = hash(s)`
  3. Извлечение view tag `v = s_h[0]` и сравнение с announced view tag
  4. Если view tags не совпадают → вывод "Not for you" и пропуск оставшихся шагов
  5. Вычисление `S_h = s_h · G`
  6. Вычисление `P_stealth = P_spend + S_h`
  7. Вычисление `a_stealth = pubkeyToAddress(P_stealth)`
  8. Сравнение с announced stealth address → результат true/false
- [ ] Визуально показывается оптимизация: при несовпадении view tag шаги 5–8 перечёркнуты/затемнены с пояснением "~6x speedup"
- [ ] Поддерживается step-by-step и live режимы
- [ ] Typecheck passes

### US-006: Вычисление stealth private key

**Description:** Как получатель, я хочу видеть, как вычисляется приватный ключ для stealth-адреса, чтобы понять, что только получатель может получить доступ к средствам.

**Acceptance Criteria:**
- [ ] Визуализируются шаги `computeStealthKey`:
  1. Вычисление shared secret `s = p_view · P_ephemeral`
  2. Хеширование `s_h = hash(s)`
  3. Вычисление stealth private key `p_stealth = p_spend + s_h`
- [ ] Визуальное подтверждение: из `p_stealth` вычисляется `P_stealth` и показывается, что `pubkeyToAddress(P_stealth)` = ранее сгенерированному stealth address
- [ ] Поддерживается step-by-step и live режимы
- [ ] Typecheck passes

### US-007: Визуализация Announcer-контракта

**Description:** Как пользователь, я хочу видеть, как работает ERC5564Announcer — singleton-контракт для публикации Announcement событий.

**Acceptance Criteria:**
- [ ] Визуализируется структура `Announcement` event: `schemeId`, `stealthAddress`, `caller`, `ephemeralPubKey`, `metadata`
- [ ] Показывается формат metadata: view tag (byte 1), function selector (bytes 2–5), token address (bytes 6–25), amount/tokenId (bytes 26–57)
- [ ] Интерактивный конструктор metadata: пользователь выбирает тип (ETH / ERC-20 / ERC-721) и заполняет поля, видя бинарное/hex представление
- [ ] Визуализируется flow: sender → `announce()` → `Announcement` event → recipient парсит
- [ ] Typecheck passes

### US-008: Переключение форматов отображения

**Description:** Как пользователь, я хочу переключаться между форматами отображения данных (hex/decimal/binary), как на sha256algorithm.com.

**Acceptance Criteria:**
- [ ] Глобальный переключатель форматов: Hex | Dec | Bin
- [ ] Все числовые значения и ключи отображаются в выбранном формате
- [ ] Переключение не сбрасывает текущий шаг и состояние
- [ ] Typecheck passes

### US-009: Визуализация операций на эллиптической кривой

**Description:** Как пользователь, я хочу видеть графическое представление операций на кривой SECP256k1, чтобы понять EC point multiplication и addition.

**Acceptance Criteria:**
- [ ] При выполнении point multiplication (`p · G`) и point addition (`P1 + P2`) показывается схематическая диаграмма эллиптической кривой
- [ ] Диаграмма анимирована: точки появляются на кривой при вычислении
- [ ] Формула кривой `y² = x³ + 7 (mod p)` отображается рядом с диаграммой
- [ ] Диаграмма упрощённая (не в реальных координатах SECP256k1, а схематичная для иллюстрации)
- [ ] Typecheck passes

### US-010: Полный сквозной сценарий (End-to-End Flow)

**Description:** Как пользователь, я хочу пройти полный сценарий от генерации ключей до извлечения stealth private key в одном потоке.

**Acceptance Criteria:**
- [ ] Кнопка "Run Full Demo" запускает весь цикл последовательно через все фазы
- [ ] Между фазами показывается переход с анимацией
- [ ] В конце отображается summary: все ключи, адреса и подтверждение корректности
- [ ] Пользователь может остановить/приостановить в любой момент
- [ ] Typecheck passes

## Functional Requirements

- **FR-1:** Приложение — single-page application на Vanilla TypeScript, без фреймворков (React, Vue, etc.)
- **FR-2:** Все криптографические операции (ECDH, SECP256k1 point multiplication/addition, Keccak-256 hashing) выполняются в браузере через JavaScript-библиотеки (noble-secp256k1, js-sha3 или аналоги)
- **FR-3:** Приложение поддерживает два режима визуализации: step-by-step (с навигацией) и live (мгновенный пересчёт)
- **FR-4:** Step-by-step навигация включает: шаг вперёд, шаг назад, автозапуск (с настраиваемой скоростью), переход к началу/концу
- **FR-5:** Каждый шаг алгоритма сопровождается: математической формулой (LaTeX/Unicode), текстовым пояснением, промежуточными значениями в выбранном формате
- **FR-6:** Поддерживаются форматы отображения: Hex, Decimal, Binary
- **FR-7:** Пользователь может ввести собственные ключи или сгенерировать случайные
- **FR-8:** Приложение визуализирует 4 фазы: Key Setup, Generate Stealth Address, Parse Announcements, Derive Stealth Key
- **FR-9:** Визуализация Announcer-контракта включает интерактивный конструктор metadata
- **FR-10:** Приложение desktop-first, адаптировано для экранов ≥ 1280px
- **FR-11:** Все входные данные валидируются (корректность hex, длина ключей, диапазон значений для SECP256k1)
- **FR-12:** URL-hash navigation — при переходе между фазами обновляется URL hash (`#keygen`, `#generate`, `#parse`, `#derive`, `#announcer`)

## Non-Goals

- Не реализуем реальную отправку транзакций в блокчейн
- Не реализуем интеграцию с MetaMask или другими кошельками
- Не реализуем ERC-6538 (Registry контракт)
- Не реализуем серверную часть / backend API
- Не реализуем мобильную адаптацию (mobile-first)
- Не реализуем поддержку схем кроме SECP256k1 (schemeId = 1)
- Не реализуем реальный мониторинг Announcement событий из блокчейна
- Не реализуем многоязычную локализацию (только английский)

## Design Considerations

### Вдохновение: sha256algorithm.com
- **Layout:** вертикальный scroll с секциями для каждой фазы
- **Цветовое кодирование:** разные цвета для разных типов данных (private keys — красный, public keys — зелёный, shared secrets — синий, addresses — фиолетовый)
- **Навигация:** sticky toolbar с кнопками управления шагами
- **Анимация:** плавные transitions при смене шагов, highlight изменившихся значений
- **Диаграмма кривой:** Canvas или SVG, схематическая кривая y²=x³+7

### Архитектура UI
```
┌─────────────────────────────────────────────────┐
│  Header: EIP-5564 Stealth Addresses Demo        │
│  [Step-by-step | Live]   [Hex | Dec | Bin]      │
├─────────────────────────────────────────────────┤
│  Overview Diagram (clickable phases)            │
├─────────────────────────────────────────────────┤
│  Phase 1: Key Setup                             │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ p_spend (in) │→ │ P_spend (out)│             │
│  │ p_view  (in) │→ │ P_view  (out)│             │
│  └──────────────┘  └──────────────┘             │
│  Result: st:eth:0x<P_spend><P_view>             │
├─────────────────────────────────────────────────┤
│  Phase 2: Generate Stealth Address              │
│  [Step 1/9] ◀ ▶ ▶▶ ⏮ ⏭                        │
│  p_eph → P_eph → s=p_eph·P_view → ...          │
│  ┌─────────────────────┐                        │
│  │ EC Curve Diagram    │                        │
│  └─────────────────────┘                        │
├─────────────────────────────────────────────────┤
│  Phase 3: Parse Announcements                   │
│  ...                                            │
├─────────────────────────────────────────────────┤
│  Phase 4: Derive Stealth Private Key            │
│  ...                                            │
├─────────────────────────────────────────────────┤
│  Phase 5: Announcer Contract                    │
│  ...                                            │
└─────────────────────────────────────────────────┘
```

## Technical Considerations

### Стек
- **Language:** TypeScript (strict mode)
- **Build:** Vite (vanilla-ts template)
- **Styling:** CSS custom properties + utility classes (без Tailwind, минимальный CSS)
- **Crypto libraries:**
  - `@noble/secp256k1` — операции на эллиптической кривой SECP256k1
  - `@noble/hashes` — Keccak-256 для вычисления Ethereum-адресов
- **Rendering:** DOM API, Canvas/SVG для диаграммы кривой
- **No dependencies:** кроме crypto-библиотек, никаких внешних зависимостей

### Структура проекта
```
eips/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts              # Entry point
│   ├── crypto/
│   │   ├── keys.ts          # Key generation, EC operations
│   │   ├── stealth.ts       # Stealth address generation/checking/derivation
│   │   └── utils.ts         # Hex/bin/dec conversions, hashing
│   ├── ui/
│   │   ├── app.ts           # Main app controller
│   │   ├── stepper.ts       # Step-by-step navigation engine
│   │   ├── phases/
│   │   │   ├── overview.ts  # Overview diagram
│   │   │   ├── keygen.ts    # Key Setup phase
│   │   │   ├── generate.ts  # Generate Stealth Address phase
│   │   │   ├── parse.ts     # Parse Announcements phase
│   │   │   ├── derive.ts    # Derive Stealth Key phase
│   │   │   └── announcer.ts # Announcer Contract phase
│   │   ├── ec-diagram.ts    # Elliptic curve visualization (Canvas/SVG)
│   │   └── format.ts        # Display format switching
│   ├── styles/
│   │   └── main.css
│   └── types/
│       └── index.ts         # Shared type definitions
└── tasks/
    └── prd-eip5564-demo.md
```

### Криптографические детали (SECP256k1, schemeId = 1)
- Кривая: `y² = x³ + 7 (mod p)`, где `p = 2²⁵⁶ - 2³² - 977`
- Generator point `G` — стандартный для SECP256k1
- Hashing: `hash(s)` — Keccak-256 от сжатого представления shared secret point
- `pubkeyToAddress(P)` — последние 20 байт Keccak-256 от несжатого public key (без префикса 0x04)
- View tag: первый байт `hash(s)`

### Производительность
- SECP256k1 операции в `@noble/secp256k1` выполняются за < 10ms в современных браузерах
- Никаких Web Workers не требуется для данного объёма вычислений

## Success Metrics

- Пользователь может пройти полный цикл EIP-5564 за < 5 минут в step-by-step режиме
- Все промежуточные значения верифицируемы — stealth address, вычисленный в демо, соответствует результату reference-реализации
- Время загрузки страницы < 2 секунды
- Приложение работает без ошибок в Chrome, Firefox, Safari (последние 2 версии)

## Open Questions

1. Использовать ли LaTeX-рендеринг (KaTeX) для формул или достаточно Unicode-символов?
2. Нужна ли кнопка "Share" для генерации URL с закодированными входными данными?
3. Стоит ли добавить раздел "Security Considerations" из EIP-5564 в демо (DoS, funding stealth wallets)?
4. Использовать ли Web Workers для crypto-операций ради неблокирующего UI, или это overkill для данного объёма?
