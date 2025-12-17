Feature: World builder adds timestamps to events

  As a World Builder
  I want to add beginning and ending timestamps to events
  So that I can track when events occurred in the world's timeline

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World builder can add beginning and ending timestamps to Events
    When the admin signs in to the system as "admin"
    And the admin navigates to the "World Entities" planning screen
    And world "Eldoria" exists
    And the admin selects world "Eldoria"
    And the admin navigates to the events tab
    And the admin ensures event "The Great War" exists with timestamps
    Then event "The Great War" appears in the events list
