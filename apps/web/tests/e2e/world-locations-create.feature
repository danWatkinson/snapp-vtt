Feature: World builder creates locations in a world

  As a World Builder
  I want to add locations to my world
  So that I can map out important places in the world

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World builder can add a Location to a World via popup
    When the admin signs in to the system as "admin"
    And world "Eldoria" exists and is selected with locations tab
    And the admin ensures location "Whispering Woods" exists
    Then location "Whispering Woods" appears in the locations list
