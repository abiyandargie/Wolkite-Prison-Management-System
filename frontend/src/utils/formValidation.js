// User form validation
export const validateUserForm = (userData) => {
    const errors = {};
  
    // First Name validation
    if (!userData.firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (userData.firstName.length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    }
  
    // Last Name validation
    if (!userData.lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (userData.lastName.length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    }
  
    // Email validation
    if (!userData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(userData.email)) {
      errors.email = "Email address is invalid";
    }
  
    // Gender validation
    if (!userData.gender) {
      errors.gender = "Please select a gender";
    }
  
    // Role validation
    if (!userData.role) {
      errors.role = "Please select a role";
    }
  
    // Password validation
   
  
    return errors;
  };
  
  // Inmate form validation
  export const validateInmateForm = (formData) => {
    const errors = {};
    
    // Required fields validation - note: sentenceYear is conditionally required based on guilty status
    const requiredFields = [
      'firstName', 
      'lastName', 
      'gender', 
      'birthDate',
      'caseType',
      'startDate'
    ];
    
    // Only make sentenceYear required if the inmate is guilty
    if (formData.guiltyStatus !== 'not_guilty') {
      requiredFields.push('sentenceYear');
    }
    
    requiredFields.forEach(field => {
      if (!formData[field]) {
        errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required.`;
      }
    });
    
    // Validate each field
    Object.entries(formData).forEach(([name, value]) => {
      // Skip fields already marked as errors
      if (errors[name]) return;
      
      const error = validateInmateField(name, value, formData);
      if (error) {
        errors[name] = error;
      }
    });
    
    // Check for relationships between fields
    if (formData.startDate && formData.releasedDate) {
      const startDate = new Date(formData.startDate);
      const releasedDate = new Date(formData.releasedDate);
      
      if (startDate >= releasedDate) {
        errors.releasedDate = 'Release date must be after the start date.';
      }
    }
    
    // If parole date is specified, validate it's after start date and before release date
    if (formData.startDate && formData.paroleDate && formData.releasedDate) {
      const startDate = new Date(formData.startDate);
      const paroleDate = new Date(formData.paroleDate);
      const releasedDate = new Date(formData.releasedDate);
      
      if (paroleDate <= startDate) {
        errors.paroleDate = 'Parole date must be after the start date.';
      }
      
      if (paroleDate >= releasedDate) {
        errors.paroleDate = 'Parole date must be before the release date.';
      }
    }
    
    // Validate birth and current addresses have all components
    const addressFields = [
      ['birthRegion', 'birthZone', 'birthWereda', 'birthKebele'],
      ['currentRegion', 'currentZone', 'currentWereda', 'currentKebele']
    ];
    
    addressFields.forEach(fields => {
      // If any field in this address group has a value, check if others are missing
      const hasAnyValue = fields.some(field => formData[field]);
      if (hasAnyValue) {
        fields.forEach(field => {
          if (!formData[field]) {
            errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required when providing address.`;
          }
        });
      }
    });
    
    // Validate contact information consistency
    if (formData.contactName && !formData.phoneNumber) {
      errors.phoneNumber = 'Phone number is required when contact name is provided.';
    }
    
    if (formData.phoneNumber && !formData.contactName) {
      errors.contactName = 'Contact name is required when phone number is provided.';
    }
    
    return errors;
  };
  
  // Parole request validation
  export const validateParoleRequest = (paroleData) => {
    const errors = {};
    
    if (!paroleData.reason || paroleData.reason.trim().length < 10) {
      errors.reason = "Reason must be at least 10 characters";
    }
    
    if (!paroleData.date) {
      errors.date = "Date is required";
    }
    
    return errors;
  };
  
  // Login validation
  export const validateLogin = (loginData) => {
    const errors = {};
    
    if (!loginData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      errors.email = "Email address is invalid";
    }
    
    if (!loginData.password) {
      errors.password = "Password is required";
    }
    
    return errors;
  };

  // Incident form validation
  export const validateIncidentForm = (incidentData) => {
    const errors = {};
    
    // Incident ID validation
    if (!incidentData.incidentId.trim()) {
      errors.incidentId = "Incident ID is required";
    }
    
    // Reporter validation
    if (!incidentData.reporter.trim()) {
      errors.reporter = "Reporter name is required";
    } else if (incidentData.reporter.trim().length < 3) {
      errors.reporter = "Reporter name must be at least 3 characters";
    }
    
    // Inmate validation
    if (!incidentData.inmate) {
      errors.inmate = "Please select an inmate";
    }
    
    // Date validation
    if (!incidentData.incidentDate) {
      errors.incidentDate = "Incident date is required";
    } else {
      const selectedDate = new Date(incidentData.incidentDate);
      const currentDate = new Date();
      if (selectedDate > currentDate) {
        errors.incidentDate = "Incident date cannot be in the future";
      }
    }
    
    // Incident type validation
    if (!incidentData.incidentType) {
      errors.incidentType = "Please select an incident type";
    }
    
    // Status validation
    if (!incidentData.status) {
      errors.status = "Please select a status";
    }
    
    // Description validation
    if (!incidentData.description.trim()) {
      errors.description = "Description is required";
    } else if (incidentData.description.trim().length < 10) {
      errors.description = "Description should be at least 10 characters";
    }
    
    return errors;
  };

  /**
   * Validates text fields to ensure they contain only letters, spaces, and hyphens (no numbers or special characters)
   * @param {string} value - The text to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  export const validateTextOnly = (value) => {
    if (!value) return true; // Allow empty values (if the field isn't required)
    const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s-]+$/;
    return regex.test(value);
  };

  /**
   * Validates mixed content fields to ensure they contain only alphanumeric characters, spaces, hyphens and slashes
   * Useful for fields like Woreda and Kebele that may contain both text and numbers
   * @param {string} value - The text to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  export const validateMixedContent = (value) => {
    if (!value) return true; // Allow empty values (if the field isn't required)
    const regex = /^[A-Za-z0-9À-ÖØ-öø-ÿ\s\-\/]+$/;
    return regex.test(value);
  };

  /**
   * Validates Ethiopian phone numbers
   * Valid formats: +251912345678, 251912345678, 0912345678, 912345678
   * @param {string} value - The phone number to validate
   * @returns {boolean} - True if valid, false otherwise
   */
  export const validateEthiopianPhoneNumber = (value) => {
    if (!value) return true; // Allow empty values (if the field isn't required)
    
    // Remove any spaces or hyphens
    const cleanedValue = value.replace(/[\s-]/g, '');
    
    // Check for valid Ethiopian phone number formats
    const regex = /^(?:\+251|251|0)?9\d{8}$/;
    return regex.test(cleanedValue);
  };

  /**
   * Validates a form field and returns an error message if invalid
   * @param {string} name - The name of the field
   * @param {string} value - The value of the field
   * @returns {string|null} - Error message or null if valid
   */
  export const validateInmateField = (name, value, formData = {}) => {
    // Skip validation for empty optional fields
    if (!value && name !== 'firstName' && name !== 'lastName' && name !== 'gender') {
      return null;
    }
    
    switch (name) {
      // Name validations
      case 'firstName':
      case 'middleName':
      case 'lastName':
        if (!value) {
          return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required.`;
        }
        if (value.length < 2) {
          return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} must be at least 2 characters.`;
        }
        if (!validateTextOnly(value)) {
          return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} should contain only letters.`;
        }
        return null;
        
      // ... other cases ...
      
      case 'sentenceYear':
        // If guiltyStatus is not_guilty, sentenceYear should be 0
        if (formData.guiltyStatus === 'not_guilty') {
          if (value !== '0' && value !== 0) {
            return 'Sentence year must be 0 for not guilty inmates.';
          }
          return null;
        }
        
        // If life imprisonment is checked, sentenceYear should be "Life"
        if (formData.lifeImprisonment) {
          if (value !== 'Life') {
            return 'Sentence year should be "Life" when life imprisonment is selected.';
          }
          return null;
        }
        
        // Normal validation for guilty inmates
        if (value) {
          // Allow "Life" as a special value
          if (value === 'Life') {
            return null;
          }
          
          const sentenceYear = parseFloat(value);
          if (isNaN(sentenceYear) || sentenceYear <= 0 || sentenceYear > 100) {
            return 'Sentence year must be a number between 0 and 100.';
          }
        } else if (formData.guiltyStatus === 'guilty') {
          return 'Sentence year is required for guilty inmates.';
        }
        return null;
    }

    // Fields that should only contain text
    const textOnlyFields = [
      'firstName', 'middleName', 'lastName', 'motherName',
      'birthRegion', 'birthZone', 'currentRegion', 'currentZone',
      'contactName', 'contactRegion', 'contactZone',
      'religion', 'registrarWorkerName'
    ];

    // Fields that can contain both text and numbers (like "Kebele 01" or "Woreda 12")
    const mixedContentFields = [
      'birthWereda', 'birthKebele',
      'currentWereda', 'currentKebele',
      'contactWereda', 'contactKebele'
    ];

    if (textOnlyFields.includes(name) && !validateTextOnly(value)) {
      return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} should only contain letters, spaces, or hyphens.`;
    }

    // Validate mixed content fields
    if (mixedContentFields.includes(name) && !validateMixedContent(value)) {
      return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} should only contain letters, numbers, spaces, or hyphens.`;
    }

    // Phone number validation for Ethiopian numbers
    if (name === 'phoneNumber' && value && !validateEthiopianPhoneNumber(value)) {
      return 'Please enter a valid Ethiopian phone number (e.g., +251912345678 or 0912345678)';
    }

    // Required fields validation
    const requiredFields = ['firstName', 'lastName', 'gender', 'birthDate', 'caseType', 'startDate', 'sentenceYear'];
    if (requiredFields.includes(name) && !value) {
      return `${name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required.`;
    }

    // Validate birthDate format and not in the future
    if (name === 'birthDate' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        return 'Please enter a valid birth date.';
      }
      if (birthDate > today) {
        return 'Birth date cannot be in the future.';
      }
      // Also check if birthdate is reasonable (e.g., not too old)
      const oldestReasonableYear = today.getFullYear() - 120;
      if (birthDate.getFullYear() < oldestReasonableYear) {
        return 'Birth date is too far in the past.';
      }
    }

    // Validate height is reasonable
    if (name === 'height' && value) {
      const height = parseFloat(value);
      if (isNaN(height) || height <= 0 || height > 250) {
        return 'Please enter a valid height (between 1 and 250 cm).';
      }
    }

    // Validate age
    if (name === 'age' && value) {
      const age = parseInt(value);
      if (isNaN(age) || age <= 0 || age > 120) {
        return 'Please enter a valid age (between 1 and 120 years).';
      }
    }

    // Validate sentence year is reasonable
    if (name === 'sentenceYear' && value) {
      const sentenceYear = parseFloat(value);
      if (isNaN(sentenceYear) || sentenceYear <= 0 || sentenceYear > 100) {
        return 'Please enter a valid sentence duration (between 0.5 and 100 years).';
      }
    }

    // Validate dates related to case
    if (name === 'startDate' && value) {
      const startDate = new Date(value);
      const today = new Date();
      if (isNaN(startDate.getTime())) {
        return 'Please enter a valid start date.';
      }
      if (startDate > today) {
        return 'Start date cannot be in the future.';
      }
    }

    // Validate special dropdown selections
    if (name === 'maritalStatus' && value) {
      const validStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'single', 'married', 'divorced', 'widowed'];
      if (!validStatuses.includes(value)) {
        return 'Please select a valid marital status.';
      }
    }

    // Validate degree level
    if (name === 'degreeLevel' && value) {
      const validDegrees = [
        'No Education', 'Primary', 'Secondary', 'Diploma', 'Bachelor', 'Masters', 'PhD',
        'none', 'elementary', 'primary', 'secondary', 'diploma', 'bachelor', 'masters', 'phd'
      ];
      if (!validDegrees.includes(value)) {
        return 'Please select a valid education level.';
      }
    }

    return null;
  };

  // Court instruction form validation
  export const validateCourtInstructionForm = (formData) => {
    const errors = {};

    // Personal information validation
    if (!formData.firstName?.trim()) {
      errors.firstName = "First name is required";
    }

    if (!formData.middleName?.trim()) {
      errors.middleName = "Middle name is required";
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = "Last name is required";
    }

    if (!formData.gender) {
      errors.gender = "Gender is required";
    }

    if (!formData.birthdate) {
      errors.birthdate = "Birth date is required";
    } else {
      const birthDate = new Date(formData.birthdate);
      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        errors.birthdate = "Please enter a valid birth date";
      } else if (birthDate > today) {
        errors.birthdate = "Birth date cannot be in the future";
      }
    }

    if (!formData.maritalStatus) {
      errors.maritalStatus = "Marital status is required";
    }

    if (!formData.nationality?.trim()) {
      errors.nationality = "Nationality is required";
    }

    if (!formData.educationLevel) {
      errors.educationLevel = "Education level is required";
    }

    if (!formData.occupation?.trim()) {
      errors.occupation = "Occupation is required";
    }

    // Birth address validation
    const birthAddressFields = ['birthRegion', 'birthZone', 'birthWoreda', 'birthKebele'];
    birthAddressFields.forEach(field => {
      if (!formData[field]?.trim()) {
        errors[field] = `${field.replace('birth', '').replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    });

    // Current address validation
    const currentAddressFields = ['currentRegion', 'currentZone', 'currentWoreda', 'currentKebele'];
    currentAddressFields.forEach(field => {
      if (!formData[field]?.trim()) {
        errors[field] = `${field.replace('current', '').replace(/([A-Z])/g, ' $1').trim()} is required`;
      }
    });

    // Case information validation
    if (!formData.courtCaseNumber?.trim()) {
      errors.courtCaseNumber = "Court case number is required";
    }

    if (!formData.caseType?.trim()) {
      errors.caseType = "Case type is required";
    }

    if (!formData.judgeName?.trim()) {
      errors.judgeName = "Judge name is required";
    }

    if (!formData.prisonName?.trim()) {
      errors.prisonName = "Prison name is required";
    }

    if (!formData.sentenceYear) {
      errors.sentenceYear = "Sentence year is required";
    } else {
      const sentenceYear = parseFloat(formData.sentenceYear);
      if (isNaN(sentenceYear) || sentenceYear <= 0) {
        errors.sentenceYear = "Please enter a valid sentence year";
      } else if (sentenceYear > 100) {
        errors.sentenceYear = "Sentence year should be less than 100";
      }
    }

    if (!formData.verdict) {
      errors.verdict = "Verdict is required";
    }

    // Dates validation
    if (!formData.hearingDate) {
      errors.hearingDate = "Hearing date is required";
    }

    if (!formData.effectiveDate) {
      errors.effectiveDate = "Effective date is required";
    } else if (formData.hearingDate && new Date(formData.effectiveDate) < new Date(formData.hearingDate)) {
      errors.effectiveDate = "Effective date should be after hearing date";
    }

    if (!formData.sendDate) {
      errors.sendDate = "Send date is required";
    }

    // Instructions validation
    if (!formData.instructions?.trim()) {
      errors.instructions = "Instructions are required";
    } else if (formData.instructions.trim().length < 10) {
      errors.instructions = "Instructions should be at least 10 characters";
    }

    // Attachment validation (only checking for required - file validations are typically done separately)
    if (!formData.attachment) {
      errors.attachment = "Attachment is required";
    }

    return errors;
  };