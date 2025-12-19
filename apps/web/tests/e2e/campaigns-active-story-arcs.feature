Feature: Game master views active story arcs in campaign timeline

  As a Game Master
  I want to see active story arcs in the campaign timeline
  So that I can track ongoing narrative threads

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Game master can see active Story Arcs in Campaign Timeline
    When the admin signs in to the system as "admin"
    And the campaign "Rise of the Dragon King" exists
    And the admin navigates to the campaign timeline view
    Then the active story arcs section is visible
