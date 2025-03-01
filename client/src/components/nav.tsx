<SheetContent>
          <SheetHeader className="mb-4">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <nav className="grid gap-2">
            <Link 
              to="/" 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <HomeIcon className="w-4 h-4" />
              Dashboard
            </Link>
            <Link 
              to="/manage-absences" 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <CalendarIcon className="w-4 h-4" />
              Manage Absences
            </Link>
            <Link 
              to="/test-auto-assign" 
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md hover:bg-accent"
              onClick={() => setOpen(false)}
            >
              <SettingsIcon className="w-4 h-4" />
              Test Auto-Assign
            </Link>
          </nav>
</SheetContent>