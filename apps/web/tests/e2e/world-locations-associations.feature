Feature: World builder associates locations within a world

  As a World Builder
  I Want to associate Locations within my World to each other
  So That I can build as detailed an understanding of my locations as I like

  Background:
    Given there is an admin user

  Scenario: World builder can create a location with a parent location
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with locations tab
    And the admin ensures location "Kingdom of Eldoria" exists
    And the admin creates location "Town of Riversend" with parent "Kingdom of Eldoria"
    Then location "Town of Riversend" appears in the locations list
    And location "Town of Riversend" is displayed as a child of "Kingdom of Eldoria"

  Scenario: World builder can create nested location hierarchies
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with locations tab
    And the admin ensures location "Kingdom of Eldoria" exists
    And the admin creates location "Town of Riversend Nested" with parent "Kingdom of Eldoria"
    And the admin creates location "Main Street" with parent "Town of Riversend Nested"
    Then location "Main Street" appears in the locations list
    And location "Main Street" is displayed as a child of "Town of Riversend Nested"
    And the locations are displayed in hierarchical order

  Scenario: World builder can create locations without a parent
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with locations tab
    And the admin creates location "Standalone Forest" without a parent
    Then location "Standalone Forest" appears in the locations list
    And location "Standalone Forest" is displayed as a top-level location

  Scenario: World builder can create complex location hierarchies
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with locations tab
    And the admin ensures location "Kingdom of Eldoria" exists
    And the admin creates location "Temple of Light" with parent "Kingdom of Eldoria"
    And the admin creates location "Secret Chamber" with parent "Temple of Light"
    And the admin creates location "Dark Forest" with parent "Kingdom of Eldoria"
    And the admin creates location "Clearing" with parent "Dark Forest"
    Then location "Secret Chamber" appears in the locations list
    And location "Clearing" appears in the locations list
    And location "Secret Chamber" is displayed as a child of "Temple of Light"
    And location "Clearing" is displayed as a child of "Dark Forest"
    And the locations are displayed in hierarchical order
