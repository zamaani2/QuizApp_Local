(function($) {
    $(document).ready(function() {
        // Function to update the terms dropdown based on selected academic year
        function updateTermsDropdown() {
            const academicYearSelect = $('#id_current_academic_year');
            const termSelect = $('#id_current_term');
            const selectedAcademicYear = academicYearSelect.val();
            
            // If no academic year selected, clear and disable the term dropdown
            if (!selectedAcademicYear) {
                termSelect.empty().append('<option value="">---------</option>').prop('disabled', true);
                return;
            }
            
            // Enable the term dropdown
            termSelect.prop('disabled', false);
            
            // Store the currently selected term, if any
            const currentTermValue = termSelect.val();
            
            // Make an AJAX request to get terms for the selected academic year
            $.ajax({
                url: '/admin/get_terms_for_academic_year/',
                data: {
                    'academic_year_id': selectedAcademicYear
                },
                dataType: 'json',
                success: function(data) {
                    // Clear the current options
                    termSelect.empty();
                    
                    // Add an empty option
                    termSelect.append($('<option></option>').attr('value', '').text('---------'));
                    
                    // Add options for each term
                    $.each(data.terms, function(index, term) {
                        termSelect.append(
                            $('<option></option>')
                                .attr('value', term.id)
                                .text(term.name)
                        );
                    });
                    
                    // Try to reselect the previously selected term if it exists in the new options
                    if (currentTermValue) {
                        termSelect.val(currentTermValue);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching terms:', error);
                    
                    // Show error in dropdown
                    termSelect.empty()
                        .append($('<option></option>').attr('value', '').text('Error loading terms'))
                        .prop('disabled', true);
                }
            });
        }
        
        // Set up event handler for academic year dropdown change
        $('#id_current_academic_year').change(updateTermsDropdown);
        
        // Initialize on page load
        updateTermsDropdown();
    });
})(django.jQuery);