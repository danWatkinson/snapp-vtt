Feature: World builder views all entities in a world

  As a World Builder
  I want to view all entities associated with my world
  So that I can see everything I've created in one place

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World builder can view all entities associated with a World
    When the admin signs in to the system as "admin"
    And the admin navigates to the "World Entities" planning screen
    And world "Eldoria" exists
    And the admin selects world "Eldoria"
    And the admin navigates to the all entities view
    Then either entities are visible or an empty message is shown
