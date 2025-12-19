Feature: World builder creates events in a world

  As a World Builder
  I want to add events to my world
  So that I can track significant happenings in the world's history

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World builder can add an Event to a World via popup
    When the admin signs in to the system as "admin"
    And world "Eldoria" exists and is selected
    And the admin navigates to the events tab
    And the admin ensures event "The Great Awakening" exists
    Then event "The Great Awakening" appears in the events list
