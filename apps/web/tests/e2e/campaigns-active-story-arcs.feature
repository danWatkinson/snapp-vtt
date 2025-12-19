Feature: Game master views active story arcs in campaign timeline

  As a Game Master
  I want to see active story arcs in the campaign timeline
  So that I can track ongoing narrative threads

  Background:
    Given there is an admin user

  Scenario: Game master can see active Story Arcs in Campaign Timeline
    When the admin signs in to the system
    And the campaign "Rise of the Dragon King" exists with timeline view
    Then the active story arcs section is visible
