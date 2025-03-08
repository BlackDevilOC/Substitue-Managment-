
package com.example.teacherattendance.ui.teachers

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.widget.SearchView
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.recyclerview.widget.LinearLayoutManager
import com.example.teacherattendance.databinding.FragmentTeachersBinding
import com.google.android.material.snackbar.Snackbar

class TeachersFragment : Fragment() {

    private var _binding: FragmentTeachersBinding? = null
    private val binding get() = _binding!!
    private lateinit var teachersAdapter: TeachersAdapter
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val teachersViewModel = ViewModelProvider(this).get(TeachersViewModel::class.java)
        _binding = FragmentTeachersBinding.inflate(inflater, container, false)
        val root: View = binding.root

        setupRecyclerView()
        setupSearchView()
        observeViewModel(teachersViewModel)
        
        // Load data
        teachersViewModel.loadTeachers()
        teachersViewModel.loadAbsentTeachers()

        return root
    }

    private fun setupRecyclerView() {
        teachersAdapter = TeachersAdapter { teacher, status ->
            val viewModel = ViewModelProvider(this).get(TeachersViewModel::class.java)
            viewModel.markAttendance(teacher.name, status, teacher.phoneNumber)
        }
        
        binding.recyclerTeachers.apply {
            layoutManager = LinearLayoutManager(context)
            adapter = teachersAdapter
        }
    }

    private fun setupSearchView() {
        binding.searchView.setOnQueryTextListener(object : SearchView.OnQueryTextListener {
            override fun onQueryTextSubmit(query: String?): Boolean {
                return false
            }

            override fun onQueryTextChange(newText: String?): Boolean {
                teachersAdapter.filter(newText ?: "")
                return true
            }
        })
    }

    private fun observeViewModel(viewModel: TeachersViewModel) {
        viewModel.teachers.observe(viewLifecycleOwner) { teachers ->
            binding.progressBar.visibility = View.GONE
            if (teachers.isEmpty()) {
                binding.textNoTeachers.visibility = View.VISIBLE
            } else {
                binding.textNoTeachers.visibility = View.GONE
                teachersAdapter.setTeachers(teachers)
            }
        }

        viewModel.absentTeachers.observe(viewLifecycleOwner) { absentTeachers ->
            teachersAdapter.setAbsentTeachers(absentTeachers)
        }

        viewModel.attendanceStatus.observe(viewLifecycleOwner) { event ->
            event.getContentIfNotHandled()?.let { status ->
                val message = if (status.success) {
                    "Teacher marked as ${status.action}"
                } else {
                    "Failed to update teacher status"
                }
                Snackbar.make(binding.root, message, Snackbar.LENGTH_SHORT).show()
                
                if (status.success) {
                    viewModel.loadAbsentTeachers() // Refresh the absent teachers list
                }
            }
        }

        viewModel.loading.observe(viewLifecycleOwner) { isLoading ->
            binding.progressBar.visibility = if (isLoading) View.VISIBLE else View.GONE
        }

        viewModel.error.observe(viewLifecycleOwner) { event ->
            event.getContentIfNotHandled()?.let { errorMessage ->
                Snackbar.make(binding.root, errorMessage, Snackbar.LENGTH_LONG).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
