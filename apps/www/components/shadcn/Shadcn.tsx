import Link from "next/link";
import { ArchiveIcon, EditIcon, ShareIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import icon from "../../assets/icon.svg";
import { ModelPicker } from "./ModelPicker";
import { ShadcnThread } from "./Shadcn copy";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function Shadcn() {
  return (
    <div className="grid h-full w-full lg:grid-cols-[250px_1fr] md:grid-cols-[220px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex flex-grow justify-between px-3"
                >
                  <Link
                    href="/"
                    className="flex items-center font-semibold text-sm"
                  >
                    <Image
                      src={icon}
                      alt="logo"
                      className="mr-2 inline size-4 dark:invert"
                    />
                    <span className="">assistant-ui</span>
                  </Link>

                  <EditIcon className="size-4" />
                  <span className="sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-4 py-1 font-medium text-sm">
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
              >
                New Chat
                <ArchiveIcon className="ml-auto size-4" />
              </Link>
              <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
              >
                Is Pineapple Pizza any good?
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            {/* <Card x-chunk="dashboard-02-chunk-0">
              <CardHeader className="p-2 pt-0 md:p-4">
                <CardTitle>Upgrade to Pro</CardTitle>
                <CardDescription>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                <Button size="sm" className="w-full">
                  Upgrade
                </Button>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4">
          {/* <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 font-medium text-lg">
                <Link
                  href="#"
                  className="flex items-center gap-2 font-semibold text-lg"
                >
                  <Package2 className="h-6 w-6" />
                  <span className="sr-only">Acme Inc</span>
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Home className="h-5 w-5" />
                  Dashboard
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl bg-muted px-3 py-2 text-foreground hover:text-foreground"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Orders
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    6
                  </Badge>
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Package className="h-5 w-5" />
                  Products
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <Users className="h-5 w-5" />
                  Customers
                </Link>
                <Link
                  href="#"
                  className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                >
                  <LineChart className="h-5 w-5" />
                  Analytics
                </Link>
              </nav>
              <div className="mt-auto">
                <Card>
                  <CardHeader>
                    <CardTitle>Upgrade to Pro</CardTitle>
                    <CardDescription>
                      Unlock all features and get unlimited access to our
                      support team.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button size="sm" className="w-full">
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </SheetContent>
          </Sheet> */}
          <div className="w-full flex-1">
            <ModelPicker />
            {/* <form>
              <div className="relative">
                <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  className="w-full appearance-none bg-background pl-8 shadow-none lg:w-1/3 md:w-2/3"
                />
              </div>
            </form> */}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="size-8">
                <ShareIcon className="size-4" />
                <span className="sr-only">Share</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Share</TooltipContent>
          </Tooltip>
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
        </header>
        <main className="flex flex-1 flex-col gap-4 p-1">
          <ShadcnThread />
          {/* <div className="flex items-center">
            <h1 className="font-semibold text-lg md:text-2xl">Inventory</h1>
          </div>
          <div
            className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm"
            x-chunk="dashboard-02-chunk-1"
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="font-bold text-2xl tracking-tight">
                You have no products
              </h3>
              <p className="text-muted-foreground text-sm">
                You can start selling as soon as you add a product.
              </p>
              <Button className="mt-4">Add Product</Button>
            </div>
          </div> */}
        </main>
      </div>
    </div>
  );
}
