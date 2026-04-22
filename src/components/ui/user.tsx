import { useState } from "react"
import { SignInButton } from "@clerk/react"
import { useIsAuthenticated, useLogOut, useAccount } from "jazz-tools/react"
import { Account } from "@/schema"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils"
import { UserProfileDialog } from "@/components/dialogs/UserProfileDialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const UserAuth = () => {
  const logOut = useLogOut()
  const isAuthenticated = useIsAuthenticated()
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const account = useAccount(Account, {
    resolve: { profile: true },
  })

  const displayName = account.$isLoaded ? account.profile.name || account.$jazz.id : "Loading..."

  const initials = getInitials(displayName)

  if (!isAuthenticated) {
    return (
      <SignInButton>
        <Button size="default">Log in</Button>
      </SignInButton>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Open user menu"
            className="inline-flex size-9 items-center justify-center rounded-full ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/90 text-sm font-semibold text-primary-foreground">
              {initials}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52 p-2">
          <DropdownMenuLabel className="truncate">
            {displayName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
            Profile & export
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Button variant="outline" size="sm" className="w-full justify-center" onClick={logOut}>Log out</Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <UserProfileDialog
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        account={account}
        displayName={displayName}
      />
    </>
  )
}
