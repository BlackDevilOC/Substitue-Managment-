<NavigationMenuItem>
                <NavigationMenuTrigger>SMS</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[200px]">
                    <li className="row-span-1">
                      <Link href="/sms-send" legacyBehavior passHref>
                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                          Send SMS
                        </NavigationMenuLink>
                      </Link>
                    </li>
                    <li className="row-span-1">
                      <Link href="/sms-test" legacyBehavior passHref>
                        <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                          SMS Test
                        </NavigationMenuLink>
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>