Feature: World builder creates creatures and factions

  As a World Builder
  I want to add creatures and factions to my world
  So that I can populate the world with interesting entities

  Background:
    Given there is an admin user

  Scenario: World builder can add Creatures and Factions to a World via popup
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with creatures tab
    And the admin ensures creature "Dragon" exists
    Then creature "Dragon" appears in the creatures list
    When the admin navigates to the factions tab
    And the admin ensures faction "Order of the Flame" exists
    Then faction "Order of the Flame" appears in the factions list
