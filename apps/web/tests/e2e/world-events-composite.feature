Feature: World builder creates composite events

  As a World Builder
  I Want to create composite events
  So That I can create a believable world

  Background:
    Given there is an admin user

  Scenario: World builder can create a composite event with sub-events
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with events tab
    And the admin ensures location "Duchy of Riversend" exists
    And the admin creates event "Rebellion in Riversend" at location "Duchy of Riversend"
    And the admin creates event "Protest in Town Square" at location "Duchy of Riversend"
    And the admin creates event "Authorities Respond" at location "Duchy of Riversend"
    And the admin links event "Protest in Town Square" as sub-event of "Rebellion in Riversend"
    And the admin links event "Authorities Respond" as sub-event of "Rebellion in Riversend"
    Then event "Rebellion in Riversend" shows it has sub-event "Protest in Town Square"
    And event "Rebellion in Riversend" shows it has sub-event "Authorities Respond"
    And event "Protest in Town Square" shows it is part of "Rebellion in Riversend"
    And event "Authorities Respond" shows it is part of "Rebellion in Riversend"

  Scenario: World builder can view sub-events when viewing a composite event
    When the admin signs in to the system
    And world "Eldoria" exists and is selected with events tab
    And the admin ensures location "Kingdom of Eldoria" exists
    And the admin creates event "Great War" at location "Kingdom of Eldoria"
    And the admin creates event "Battle of the North" at location "Kingdom of Eldoria"
    And the admin creates event "Siege of the Capital" at location "Kingdom of Eldoria"
    And the admin links event "Battle of the North" as sub-event of "Great War"
    And the admin links event "Siege of the Capital" as sub-event of "Great War"
    And the admin views event "Great War"
    Then event "Great War" displays sub-events:
      | Battle of the North |
      | Siege of the Capital |
