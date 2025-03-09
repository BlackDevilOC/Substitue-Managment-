package com.example.teacherattendance

import android.os.Bundle
import android.view.Menu
import android.view.MenuItem
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.navigation.findNavController
import androidx.navigation.ui.AppBarConfiguration
import androidx.navigation.ui.navigateUp
import androidx.navigation.ui.setupActionBarWithNavController
import com.example.teacherattendance.databinding.ActivityMainBinding
import com.example.teacherattendance.offline.OfflineStorage
import com.example.teacherattendance.offline.SyncManager
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.navigation.NavigationView
import androidx.drawerlayout.widget.DrawerLayout
import androidx.navigation.ui.setupWithNavController

class MainActivity : AppCompatActivity() {

    private lateinit var appBarConfiguration: AppBarConfiguration
    private lateinit var binding: ActivityMainBinding
    private lateinit var offlineStorage: OfflineStorage
    private lateinit var syncManager: SyncManager

    override fun onCreate(savedInstanceState: Bundle?) {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        super.onCreate(savedInstanceState)

        // Initialize offline storage and sync manager
        offlineStorage = OfflineStorage(applicationContext)
        syncManager = SyncManager(
            context = applicationContext,
            offlineStorage = offlineStorage,
            apiService = TeacherApiService
        )

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.appBarMain.toolbar)

        binding.appBarMain.fab.setOnClickListener { view ->
            Snackbar.make(view, "Auto-assign substitutes?", Snackbar.LENGTH_LONG)
                .setAnchorView(R.id.fab)
                .setAction("Confirm") {
                    // Call auto-assign API with offline support
                    TeacherApiService.autoAssignSubstitutes { success ->
                        if (success) {
                            Snackbar.make(view, "Substitutes assigned successfully", Snackbar.LENGTH_SHORT).show()
                        } else {
                            Snackbar.make(view, "Failed to assign substitutes", Snackbar.LENGTH_SHORT).show()
                        }
                    }
                }.show()
        }

        val drawerLayout: DrawerLayout = binding.drawerLayout
        val navView: NavigationView = binding.navView
        val navController = findNavController(R.id.nav_host_fragment_content_main)

        appBarConfiguration = AppBarConfiguration(
            setOf(
                R.id.nav_dashboard, R.id.nav_teachers, R.id.nav_absences, R.id.nav_substitutes,
                R.id.nav_timetable, R.id.nav_period_config, R.id.nav_settings
            ), drawerLayout
        )

        setupActionBarWithNavController(navController, appBarConfiguration)
        navView.setupWithNavController(navController)

        // Start sync manager
        syncManager.startSync()
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        menuInflater.inflate(R.menu.main, menu)
        return true
    }

    override fun onSupportNavigateUp(): Boolean {
        val navController = findNavController(R.id.nav_host_fragment_content_main)
        return navController.navigateUp(appBarConfiguration) || super.onSupportNavigateUp()
    }

    override fun onDestroy() {
        super.onDestroy()
        syncManager.cancel()
    }
}