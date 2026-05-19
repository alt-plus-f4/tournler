# Dialog and Modal Component Usage Report

## Summary

This report identifies all Dialog, Drawer, and related modal components used in the Tournler application, with a focus on hydration mismatches and suppressHydrationWarning usage.

### Key Finding

**⚠️ CRITICAL**: None of the Dialog, Drawer, DropdownMenu, or Select components have `suppressHydrationWarning` attributes, which may cause hydration mismatches due to their use of Radix UI's `data-state` attributes.

---

## Dialog Component Usage

### UI Component Definition

- **File**: [src/components/ui/dialog.tsx](src/components/ui/dialog.tsx)
- **Status**: ✅ Marked as `'use client'` (line 1)
- **Issue**: ⚠️ No `suppressHydrationWarning` on DialogOverlay or DialogContent
- **Affected Elements**:
  - `DialogOverlay` (line 17-27): Uses `data-[state=open]:animate-in` and `data-[state=closed]:animate-out`
  - `DialogContent` (line 33-56): Uses multiple `data-[state]` classes for animations

### Dialog Usage in Components

#### 1. EditTeamDialog

- **File**: [src/components/EditTeamDialog.tsx](src/components/EditTeamDialog.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **Dialog Usage**: Line 107
  - `<Dialog open={isOpen} onOpenChange={onClose}>`
- **Purpose**: Edit team details
- **State Management**: Uses `isOpen` prop controlled from parent

#### 2. LeaveTeamDialog

- **File**: [src/components/LeaveTeamDialog.tsx](src/components/LeaveTeamDialog.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **Dialog Usage**: Lines 35-36
  - `<Dialog open={open} onOpenChange={setOpen}>` (line 35)
  - `<DialogTrigger asChild>{children}</DialogTrigger>` (line 36)
- **Purpose**: Confirm team leave action
- **State Management**: Local state with `useState(false)`

#### 3. JoinLeaveButton

- **File**: [src/components/JoinLeaveButton.tsx](src/components/JoinLeaveButton.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **Dialog Usage**: Line 152
  - `<Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>`
- **Purpose**: Confirm join/leave tournament action
- **State Management**: Local state `isDialogOpen` with `useState(false)` (line 25)

#### 4. EditTournamentDialog

- **File**: [src/components/EditTournamentDialog.tsx](src/components/EditTournamentDialog.tsx)
- **Status**: ✅ `'use client'` component
- **Dialog Usage**: Line 99
  - `<Dialog open={isOpen} onOpenChange={onClose}>`
- **Purpose**: Edit tournament details
- **State Management**: Controlled via `isOpen` prop

#### 5. EditUserDialog

- **File**: [src/components/EditUserDialog.tsx](src/components/EditUserDialog.tsx)
- **Status**: ✅ `'use client'` component
- **Dialog Usage**: Line 85
  - `<Dialog open={isOpen} onOpenChange={onClose}>`
- **DialogContent**: Line 86 with `className='sm:max-w-[425px]'`
- **Purpose**: Edit user profile
- **State Management**: Controlled via `isOpen` prop

#### 6. InviteConfirmationDialog

- **File**: [src/components/InviteConfirmationDialog.tsx](src/components/InviteConfirmationDialog.tsx)
- **Status**: ✅ `'use client'` component
- **Dialog Usage**: Line 67
  - `<Dialog open={isOpen} onOpenChange={setIsOpen}>`
- **DialogContent**: Line 68 with `className='sm:max-w-[375px]'`
- **Purpose**: Confirm team invitation
- **State Management**: Local state with `useState(false)`

#### 7. TournamentForm

- **File**: [src/components/TournamentForm.tsx](src/components/TournamentForm.tsx)
- **Status**: ✅ `'use client'` component
- **Dialog Usage**: Lines 53-54
  - `<Dialog>` (line 53)
  - `<DialogTrigger asChild>` (line 54)
- **DialogContent**: Line 57 with `className='h-[800px] overflow-scroll'`
- **Purpose**: Create tournament with form
- **State Management**: Uncontrolled dialog (relies on DialogTrigger)

#### 8. TeamForm

- **File**: [src/components/TeamForm.tsx](src/components/TeamForm.tsx)
- **Status**: ✅ `'use client'` component
- **Dialog Usage**: Lines 37-38
  - `<Dialog>` (line 37)
  - `<DialogTrigger asChild>` (line 38)
- **DialogContent**: Line 41 with `className="h-[500px] overflow-scroll"`
- **Purpose**: Create team with form
- **State Management**: Uncontrolled dialog

#### 9. Onboarding

- **File**: [src/components/Onboarding.tsx](src/components/Onboarding.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **Dialog Usage**: Line 221
  - `<Dialog open={open}>`
- **DialogContent**: Line 226 with `className='max-w-max'`
- **DialogTitle**: Line 223 with `className='hidden'` (accessibility fix)
- **Purpose**: Multi-step onboarding process
- **State Management**: Controlled via `open` state

#### 10. Profile Page Avatar Dialog

- **File**: [src/app/profile/[userId]/page.tsx](src/app/profile/[userId]/page.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **Dialog Usage**: Line 411
  - `<Dialog ...>`
- **DialogContent**: Line 418 with custom styling
- **Purpose**: Change user avatar
- **State Management**: Local state management

#### 11. Command Dialog (UI Component)

- **File**: [src/components/ui/command.tsx](src/components/ui/command.tsx)
- **Status**: ✅ `'use client'` component
- **Dialog Usage**: Line 36
  - `<Dialog {...props}>`
- **Purpose**: Command palette implementation
- **Note**: This is an internal UI component wrapper

---

## Drawer Component Usage

### UI Component Definition

- **File**: [src/components/ui/drawer.tsx](src/components/ui/drawer.tsx)
- **Status**: ✅ Marked as `'use client'` (line 1)
- **Issue**: ⚠️ No `suppressHydrationWarning` on DrawerOverlay or DrawerContent
- **Library**: Uses `vaul` (external drawer library)
- **Affected Elements**:
  - `DrawerOverlay` (line 25-34): Static classes, but portal rendering may cause issues
  - `DrawerContent` (line 37-54): Portal rendering with animations

### Drawer Usage in Components

#### TeamDrawer (TeamCreationDrawer)

- **File**: [src/components/TeamDrawer.tsx](src/components/TeamDrawer.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **Drawer Usage**: Multiple drawer imports (lines 6-14)
  - `Drawer`
  - `DrawerTrigger`
  - `DrawerContent`
  - `DrawerDescription`
  - `DrawerHeader`
  - `DrawerTitle`
  - `DrawerClose`
- **Purpose**: Create new team from drawer interface
- **State Management**: Not fully visible in excerpt, likely uses drawer state

---

## DropdownMenu Component Usage

### UI Component Definition

- **File**: [src/components/ui/dropdown-menu.tsx](src/components/ui/dropdown-menu.tsx)
- **Status**: ✅ Marked as `'use client'` (line 1)
- **Issue**: ⚠️ No `suppressHydrationWarning` on DropdownMenuContent and DropdownMenuSubContent
- **Affected Elements**:
  - `DropdownMenuSubContent` (line 47): Uses `data-[state=open]:animate-in` and `data-[state=closed]:animate-out`
  - `DropdownMenuContent` (line 64): Uses `data-[state]` classes for animations

### DropdownMenu Usage in Components

#### UserNav

- **File**: [src/components/UserNav.tsx](src/components/UserNav.tsx)
- **Status**: ✅ `'use client'` component (line 1)
- **DropdownMenu Usage**: Line 6
  - Full import: `DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuTrigger`
- **Purpose**: User profile dropdown menu with actions
- **State Management**: Managed by DropdownMenu primitive

---

## Select Component Usage

### UI Component Definition

- **File**: [src/components/ui/select.tsx](src/components/ui/select.tsx)
- **Status**: ✅ Marked as `'use client'` (line 1)
- **Issue**: ⚠️ No `suppressHydrationWarning` on SelectContent
- **Affected Elements**:
  - `SelectContent` (line 75): Uses `data-[state=open]:animate-in` and `data-[state=closed]:animate-out`

---

## Hydration Mismatch Issues

### Root Cause

All modal/dropdown/select components from Radix UI use the `data-state` attribute which is set dynamically at runtime. When these components are used on server-rendered pages with Next.js, the server and client may render different `data-state` values initially, causing hydration mismatches.

### Components Affected

1. **Dialog** (dialog.tsx):

   - DialogOverlay: Uses `data-[state]` classes for animations
   - DialogContent: Uses `data-[state]` classes for animations

2. **Drawer** (drawer.tsx):

   - DrawerOverlay: Portal rendering
   - DrawerContent: Portal rendering with animations

3. **DropdownMenu** (dropdown-menu.tsx):

   - DropdownMenuContent: Uses `data-[state]` classes
   - DropdownMenuSubContent: Uses `data-[state]` classes

4. **Select** (select.tsx):
   - SelectContent: Uses `data-[state]` classes

### Missing suppressHydrationWarning

None of the affected components have the `suppressHydrationWarning` attribute, which would suppress console warnings about hydration mismatches for these specific elements.

---

## Recommendations

### 1. Add suppressHydrationWarning to UI Components

Update the following components to add `suppressHydrationWarning`:

#### dialog.tsx - DialogOverlay (lines 17-27)

```tsx
<DialogPrimitive.Overlay
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
/>
```

#### dialog.tsx - DialogContent (lines 33-56)

```tsx
<DialogPrimitive.Content
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
>
```

#### drawer.tsx - DrawerOverlay (lines 29-33)

```tsx
<DrawerPrimitive.Overlay
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
/>
```

#### drawer.tsx - DrawerContent (lines 43-55)

```tsx
<DrawerPrimitive.Content
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
>
```

#### dropdown-menu.tsx - DropdownMenuContent (line 64)

```tsx
<DropdownMenuPrimitive.Content
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
/>
```

#### dropdown-menu.tsx - DropdownMenuSubContent (line 47)

```tsx
<DropdownMenuPrimitive.SubContent
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
/>
```

#### select.tsx - SelectContent (line 75)

```tsx
<SelectPrimitive.Content
  ref={ref}
  suppressHydrationWarning
  className={...}
  {...props}
>
```

### 2. Verify Client Component Boundaries

All Dialog/Drawer/Dropdown/Select using components are correctly marked with `'use client'`, so this is not an issue.

### 3. Testing

After adding `suppressHydrationWarning`:

1. Test on slow 3G network to catch any real hydration issues
2. Run development build and check for console warnings
3. Verify animations work correctly on both server and client render
4. Test on different browsers to ensure consistency

---

## Summary Table

| Component                | File                         | Line(s) | Issue                            | Status |
| ------------------------ | ---------------------------- | ------- | -------------------------------- | ------ |
| DialogOverlay            | dialog.tsx                   | 17-27   | Missing suppressHydrationWarning | ⚠️     |
| DialogContent            | dialog.tsx                   | 33-56   | Missing suppressHydrationWarning | ⚠️     |
| DrawerOverlay            | drawer.tsx                   | 25-34   | Missing suppressHydrationWarning | ⚠️     |
| DrawerContent            | drawer.tsx                   | 37-54   | Missing suppressHydrationWarning | ⚠️     |
| DropdownMenuContent      | dropdown-menu.tsx            | 56-67   | Missing suppressHydrationWarning | ⚠️     |
| DropdownMenuSubContent   | dropdown-menu.tsx            | 44-54   | Missing suppressHydrationWarning | ⚠️     |
| SelectContent            | select.tsx                   | 68-93   | Missing suppressHydrationWarning | ⚠️     |
| EditTeamDialog           | EditTeamDialog.tsx           | 107     | Uses Dialog (parent issue)       | ✅     |
| LeaveTeamDialog          | LeaveTeamDialog.tsx          | 35-36   | Uses Dialog (parent issue)       | ✅     |
| JoinLeaveButton          | JoinLeaveButton.tsx          | 152     | Uses Dialog (parent issue)       | ✅     |
| EditTournamentDialog     | EditTournamentDialog.tsx     | 99      | Uses Dialog (parent issue)       | ✅     |
| EditUserDialog           | EditUserDialog.tsx           | 85      | Uses Dialog (parent issue)       | ✅     |
| InviteConfirmationDialog | InviteConfirmationDialog.tsx | 67      | Uses Dialog (parent issue)       | ✅     |
| TournamentForm           | TournamentForm.tsx           | 53-54   | Uses Dialog (parent issue)       | ✅     |
| TeamForm                 | TeamForm.tsx                 | 37-38   | Uses Dialog (parent issue)       | ✅     |
| Onboarding               | Onboarding.tsx               | 221     | Uses Dialog (parent issue)       | ✅     |
| Profile Page Avatar      | profile/[userId]/page.tsx    | 411     | Uses Dialog (parent issue)       | ✅     |
| UserNav                  | UserNav.tsx                  | 6       | Uses DropdownMenu (parent issue) | ✅     |
| TeamDrawer               | TeamDrawer.tsx               | 6-14    | Uses Drawer (parent issue)       | ✅     |

---

## Generated

Report date: 2026-05-19
Workspace: /Users/valentinasenov/Desktop/tournler
