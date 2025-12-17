Feature: World builder creates worlds

  As a World Builder
  I want to create worlds
  So that I can organize locations, characters, and events within a consistent setting

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World builder creates a world via the UI
    When the admin signs in to the system as "admin"
    And the admin navigates to the "World Entities" planning screen
    And the admin creates a world named "Eldoria" with description "A high-fantasy realm of magic"
    Then the UI shows "Eldoria" in the world context selector
