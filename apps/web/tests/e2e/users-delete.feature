Feature: Admin deletes a user

  As an Admin
  I want to delete users from the system
  So that I can remove accounts that are no longer needed

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Admin can delete a user
    When the admin signs in to the system as "admin"
    And the admin navigates to the "Users" management screen
    And the admin creates a new user via the Users UI
    And the admin deletes that user from the users list
    Then the deleted user no longer appears in the users list
